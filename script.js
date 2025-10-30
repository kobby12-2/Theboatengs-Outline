(function () {
  const SPLASH_MIN_MS = 3000; // 3 seconds
  const SPLASH_MAX_MS = 20000; // 20 seconds

  // Set target to exactly 5s within the clamp
  const preferredMs = 3000;
  const splashDurationMs = Math.min(SPLASH_MAX_MS, Math.max(SPLASH_MIN_MS, preferredMs));

  const splashEl = document.getElementById('splash');
  const contentEl = document.getElementById('content');

  function paginateTimeline() {
    var slidesContainer = document.querySelector('.slides');
    if (!slidesContainer) return;

    var firstOutlineSlide = slidesContainer.querySelector('section.slide-compact');
    if (!firstOutlineSlide) return;

    var inner = firstOutlineSlide.querySelector('.slide-inner');
    var list = firstOutlineSlide.querySelector('ol.timeline[data-paginate="timeline"]');
    if (!inner || !list) return;

    // Collect items from ALL outline slides (if repaginating after resize)
    var allItems = [];
    var outlineSlides = Array.prototype.slice.call(slidesContainer.querySelectorAll('section.slide-compact'));
    outlineSlides.forEach(function (slide, idx) {
      var l = slide.querySelector('ol.timeline');
      if (!l) return;
      Array.prototype.forEach.call(l.children, function (li) { allItems.push(li); });
      if (idx !== 0) {
        // remove subsequent slides; we'll rebuild
        slidesContainer.removeChild(slide);
      }
    });

    // Clear first list
    list.innerHTML = '';

    var isFirstOutlinePage = true;
    var outlineSlideCount = 1;
    var MAX_OUTLINE_SLIDES = 10; // allow continuation pages
    function createSlide() {
      if (outlineSlideCount >= MAX_OUTLINE_SLIDES) {
        // Fallback: if somehow exceeded, keep using current
        return { slide: firstOutlineSlide, inner: inner, list: list };
      }
      var clone = firstOutlineSlide.cloneNode(true);
      var cloneInner = clone.querySelector('.slide-inner');
      var cloneTitle = cloneInner.querySelector('.slide-title');
      var cloneList = cloneInner.querySelector('ol.timeline');
      if (!isFirstOutlinePage && cloneTitle) {
        cloneTitle.parentNode.removeChild(cloneTitle);
      }
      cloneList.innerHTML = '';
      slidesContainer.appendChild(clone);
      outlineSlideCount += 1;
      return { slide: clone, inner: cloneInner, list: cloneList };
    }

    // Use existing as current target
    var current = { slide: firstOutlineSlide, inner: inner, list: list };

    // Append ceremony timeline items one by one and measure; if overflow, move item to a new slide
    // On small screens, enforce a hard cap of 5 items per slide (so page 1 has 1-5, page 2 has 6-10)
    var isMobile = window.innerWidth <= 600;
    var itemsOnCurrentTimelineSlide = 0;
    for (var i = 0; i < allItems.length; i++) {
      var li = allItems[i];
      current.list.appendChild(li);
      var overflow = current.inner.scrollHeight > current.inner.clientHeight;
      itemsOnCurrentTimelineSlide += 1;
      var exceedMobileCap = isMobile && itemsOnCurrentTimelineSlide > 5;
      if (overflow || exceedMobileCap) {
        current.list.removeChild(li);
        isFirstOutlinePage = false;
        current = createSlide();
        current.list.appendChild(li);
        itemsOnCurrentTimelineSlide = 1;
      }
    }

    firstOutlineSlide.dataset.paginated = 'true';

    // Now append the photography section under the outline
    var photoSection = document.querySelector('section.photography, .photography');
    if (photoSection) {
      // Remove previously paginated photo lists/titles so we don't duplicate on re-run
      var existingPhotoBits = slidesContainer.querySelectorAll('.slide .photo-title, .slide ol.photo-list');
      Array.prototype.forEach.call(existingPhotoBits, function (node) {
        if (!photoSection.contains(node)) {
          if (node.parentNode) node.parentNode.removeChild(node);
        }
      });
      var photoTitle = photoSection.querySelector('.photo-title');
      var photoList = photoSection.querySelector('ol.photo-list');
      var photoItems = [];
      if (photoList) {
        Array.prototype.forEach.call(photoList.children, function (li) { photoItems.push(li); });
        photoList.innerHTML = '';
      }

      var titlePlaced = false;
      function placePhotoTitleIfNeeded() {
        if (titlePlaced || !photoTitle) return;
        // Ensure photography starts on a fresh slide after outline pages (on mobile this becomes page 4)
        if (current.list && current.list.children && current.list.children.length > 0) {
          isFirstOutlinePage = false;
          current = createSlide();
        }
        // Temporarily append title to current slide to test fit
        current.inner.appendChild(photoTitle);
        var overflow = current.inner.scrollHeight > current.inner.clientHeight;
        if (overflow) {
          current.inner.removeChild(photoTitle);
          isFirstOutlinePage = false;
          current = createSlide();
          current.inner.appendChild(photoTitle);
        }
        titlePlaced = true;
      }

      var itemsOnCurrentPhotoSlide = 0;
      var MAX_PHOTO_ITEMS_PER_SLIDE = 1000; // effectively rely on height overflow
      for (var j = 0; j < photoItems.length; j++) {
        var pi = photoItems[j];
        if (!titlePlaced) placePhotoTitleIfNeeded();
        // place list container lazily
        var currentPhotoList = current.inner.querySelector('ol.photo-list');
        if (!currentPhotoList) {
          currentPhotoList = document.createElement('ol');
          currentPhotoList.className = 'photo-list';
          current.inner.appendChild(currentPhotoList);
        }
        currentPhotoList.appendChild(pi);
        var overflowPhoto = current.inner.scrollHeight > current.inner.clientHeight;
        itemsOnCurrentPhotoSlide += 1;
        if (overflowPhoto || itemsOnCurrentPhotoSlide >= MAX_PHOTO_ITEMS_PER_SLIDE) {
          // Move overflowing items to a new continuation page
          currentPhotoList.removeChild(pi);
          isFirstOutlinePage = false;
          current = createSlide();
          // Do NOT repeat the photo title on continuation pages
          var newList = document.createElement('ol');
          newList.className = 'photo-list';
          current.inner.appendChild(newList);
          newList.appendChild(pi);
          itemsOnCurrentPhotoSlide = 1;
        }
      }

      // Remove any duplicate photography titles that might have been added
      var photoTitles = slidesContainer.querySelectorAll('.photo-title');
      for (var t = 1; t < photoTitles.length; t++) {
        var node = photoTitles[t];
        if (node && node.parentNode) node.parentNode.removeChild(node);
      }


      // Deduplicate a repeated first item: keep only the first
      var seenOfficiating = false;
      var allPhotoItems = slidesContainer.querySelectorAll('ol.photo-list li');
      Array.prototype.forEach.call(allPhotoItems, function (li) {
        var text = (li.textContent || '').trim().toUpperCase();
        if (text.indexOf('COUPLE WITH OFFICIATING MINISTERS') !== -1) {
          if (seenOfficiating) {
            if (li.parentNode) li.parentNode.removeChild(li);
          } else {
            seenOfficiating = true;
          }
        }
      });
    }

    // Remove ALL existing per-slide swipe hints and use a single global hint instead
    var existingHints = slidesContainer.querySelectorAll('.swipe-hint');
    Array.prototype.forEach.call(existingHints, function (hint) {
      if (hint && hint.parentNode) hint.parentNode.removeChild(hint);
    });

    // Create a single global swipe hint that sits above the fixed logo
    var globalHint = document.querySelector('.swipe-hint-global');
    if (!globalHint) {
      globalHint = document.createElement('div');
      globalHint.className = 'swipe-hint-global';
      document.body.appendChild(globalHint);
    }

    var slides = Array.prototype.slice.call(slidesContainer.querySelectorAll('section.slide'));

    function updateHintText() {
      var index = Math.round(slidesContainer.scrollLeft / slidesContainer.clientWidth);
      if (index < 0) index = 0;
      if (index > slides.length - 1) index = slides.length - 1;
      var isLast = index === slides.length - 1;
      globalHint.textContent = isLast ? 'Swipe back' : 'Swipe left to next page';
    }

    // Bind scroll listener once
    if (!slidesContainer.dataset.hintBound) {
      slidesContainer.addEventListener('scroll', updateHintText, { passive: true });
      slidesContainer.dataset.hintBound = 'true';
    }
    updateHintText();
  }

  function showContent() {
    if (!splashEl || !contentEl) return;
    splashEl.classList.add('is-hidden');
    // Reveal content after splash fade-out starts for a smooth crossfade
    setTimeout(function () {
      contentEl.hidden = false;
      // Optional: scroll to top to avoid any jump
      window.scrollTo(0, 0);
      // After content is visible, paginate timeline to fit viewport pages
      paginateTimeline();
    }, 200);
  }

  // Ensure images are loaded; then start timer
  function whenImagesReady(callback) {
    const urls = [
      'caramel background.png',
      'tb brown logo.png'
    ];

    let loaded = 0;
    const done = function () { loaded += 1; if (loaded >= urls.length) callback(); };

    urls.forEach(function (url) {
      const img = new Image();
      img.onload = done;
      img.onerror = done; // proceed even if one image fails
      img.src = url;
    });
  }

  function start() {
    if (!splashEl || !contentEl) return;
    // Keep content hidden until we switch
    contentEl.hidden = true;

    whenImagesReady(function () {
      setTimeout(showContent, splashDurationMs);
    });
  }

  if (document.readyState === 'complete' || document.readyState === 'interactive') {
    // Delay a tick to allow CSS to apply
    setTimeout(start, 0);
  } else {
    window.addEventListener('DOMContentLoaded', start);
  }

  // Re-paginate on resize to keep slides fitting the viewport
  window.addEventListener('resize', function () {
    // Only run after content is visible
    if (contentEl && !contentEl.hidden) {
      paginateTimeline();
    }
  });
})();


