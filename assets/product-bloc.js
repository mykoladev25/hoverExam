if (!customElements.get('product-bloc-section')) {
  customElements.define(
    'product-bloc-section',
    class ProductBlocSection extends HTMLElement {
      connectedCallback() {
        if (this.initialized) return;
        this.initialized = true;

        this.sectionId = this.dataset.sectionId;

        this.setupGalleryProgress();
        this.setupVariantState();
        this.setupAccordions();
      }

      disconnectedCallback() {
        if (this.galleryViewerSlideChangedHandler && this.galleryViewer) {
          this.galleryViewer.removeEventListener('slideChanged', this.galleryViewerSlideChangedHandler);
        }

        if (this.galleryScrollHandler && this.galleryList) {
          this.galleryList.removeEventListener('scroll', this.galleryScrollHandler);
        }

        if (this.galleryProgressResizeHandler) {
          window.removeEventListener('resize', this.galleryProgressResizeHandler);
        }

        if (this.variantIdChangeHandler && this.variantIdInput) {
          this.variantIdInput.removeEventListener('change', this.variantIdChangeHandler);
        }

        this.variantChangeUnsubscriber?.();
      }

      setupGalleryProgress() {
        this.galleryViewer = this.querySelector("slider-component[id^='GalleryViewer-']");
        this.galleryList = this.galleryViewer?.querySelector('.product__media-list');
        this.galleryProgress = this.querySelector('[data-gallery-progress]');
        this.galleryProgressTrack = this.querySelector('.product-bloc__mobile-gallery-progress-track');
        this.galleryProgressIndicator = this.querySelector('[data-gallery-progress-indicator]');
        this.galleryProgressLabel = this.querySelector('[data-gallery-progress-label]');
        this.galleryControls = this.galleryViewer?.querySelector('.slider-buttons.quick-add-hidden');

        if (
          !this.galleryViewer ||
          !this.galleryList ||
          !this.galleryProgress ||
          !this.galleryProgressTrack ||
          !this.galleryProgressIndicator
        )
          return;

        this.galleryViewerSlideChangedHandler = (event) => {
          this.syncGalleryProgress(event.detail?.currentPage);
        };
        this.galleryScrollHandler = () => {
          this.syncGalleryProgress();
        };
        this.galleryProgressResizeHandler = () => {
          this.syncGalleryProgress();
        };

        this.galleryViewer.addEventListener('slideChanged', this.galleryViewerSlideChangedHandler);
        this.galleryList.addEventListener('scroll', this.galleryScrollHandler, { passive: true });
        window.addEventListener('resize', this.galleryProgressResizeHandler);

        requestAnimationFrame(() => {
          this.syncGalleryProgress();
        });
      }

      syncGalleryProgress(currentPageOverride) {
        if (
          !this.galleryProgress ||
          !this.galleryProgressTrack ||
          !this.galleryProgressIndicator ||
          !this.galleryViewer ||
          !this.galleryList
        )
          return;

        const totalPages = this.getGalleryTotalPages();
        const currentPage = currentPageOverride || this.getGalleryCurrentPage();
        const isMobileViewport = window.matchMedia('(max-width: 749px)').matches;
        const scrollWidth = this.galleryList.scrollWidth;
        const clientWidth = this.galleryList.clientWidth;
        const maxScroll = Math.max(scrollWidth - clientWidth, 0);
        const hasScrollableGallery = maxScroll > 1;
        const shouldHide = totalPages < 2 || !isMobileViewport || !hasScrollableGallery;

        this.galleryProgress.hidden = shouldHide;
        if (shouldHide) return;

        const trackWidth = this.galleryProgressTrack.clientWidth;
        const indicatorWidthPercent = Math.min(Math.max((clientWidth / scrollWidth) * 100, 12), 100);
        const indicatorWidth = trackWidth * (indicatorWidthPercent / 100);
        const scrollProgress = maxScroll > 0 ? this.galleryList.scrollLeft / maxScroll : 0;
        const indicatorOffset = (trackWidth - indicatorWidth) * scrollProgress;

        this.galleryProgressIndicator.style.width = `${indicatorWidth}px`;
        this.galleryProgressIndicator.style.transform = `translate3d(${indicatorOffset}px, 0, 0)`;

        if (this.galleryProgressLabel) {
          this.galleryProgressLabel.textContent = `${currentPage}/${totalPages}`;
        }
      }

      getGalleryCurrentPage() {
        const currentPage =
          Number.parseInt(this.galleryViewer?.currentPageElement?.textContent, 10) || this.galleryViewer?.currentPage || 1;

        return Math.max(currentPage, 1);
      }

      getGalleryTotalPages() {
        const totalPages =
          Number.parseInt(this.galleryViewer?.pageTotalElement?.textContent, 10) ||
          this.galleryViewer?.totalPages ||
          this.galleryViewer?.sliderItemsToShow?.length ||
          0;

        return Math.max(totalPages, 0);
      }

      setupVariantState() {
        this.buttonPrice = this.querySelector('[data-cta-price]');
        this.buttonDivider = this.querySelector('[data-cta-divider]');
        this.availabilityStatus = this.querySelector('[data-availability-status]');
        this.availabilityCopy = this.querySelector('[data-availability-copy]');
        this.deliveryCopy = this.querySelector('[data-delivery-copy]');
        this.variantData = Array.from(this.querySelectorAll('[data-variant-data]'));
        this.variantIdInput = this.querySelector('.product-variant-id');

        this.variantIdChangeHandler = (event) => {
          this.applyVariantData(event.target.value);
        };
        this.variantIdInput?.addEventListener('change', this.variantIdChangeHandler);

        const initialVariantId = this.variantIdInput?.value;
        if (initialVariantId) {
          this.applyVariantData(initialVariantId);
        }

        if (typeof subscribe !== 'function' || typeof PUB_SUB_EVENTS === 'undefined') return;

        this.variantChangeUnsubscriber = subscribe(PUB_SUB_EVENTS.variantChange, ({ data }) => {
          if (!data?.variant || `${data.sectionId}` !== `${this.sectionId}`) return;
          this.applyVariantData(data.variant.id);
        });
      }

      applyVariantData(variantId) {
        const variantNode = this.variantData.find((node) => node.dataset.variantId === `${variantId}`);

        if (!variantNode) {
          if (this.buttonPrice) this.buttonPrice.hidden = true;
          if (this.buttonDivider) this.buttonDivider.hidden = true;
          if (this.availabilityStatus) {
            this.availabilityStatus.textContent = this.availabilityStatus.dataset.soldOutText || '';
          }
          if (this.availabilityCopy) {
            this.availabilityCopy.hidden = true;
          }
          if (this.deliveryCopy) {
            this.deliveryCopy.hidden = true;
          }
          return;
        }

        const priceText = variantNode.dataset.priceText || '';
        const isAvailable = variantNode.dataset.available !== 'false';

        if (this.buttonPrice) {
          this.buttonPrice.textContent = priceText;
          this.buttonPrice.hidden = !priceText;
        }

        if (this.buttonDivider) {
          this.buttonDivider.hidden = !priceText;
        }

        if (this.availabilityStatus) {
          const inStockText = this.availabilityStatus.dataset.inStockText || '';
          const soldOutText = this.availabilityStatus.dataset.soldOutText || '';
          this.availabilityStatus.textContent = isAvailable ? inStockText : soldOutText;
        }

        if (this.availabilityCopy) {
          this.availabilityCopy.hidden = !isAvailable || !this.availabilityCopy.dataset.copyText;
        }

        if (this.deliveryCopy) {
          this.deliveryCopy.hidden = !isAvailable || !this.deliveryCopy.dataset.deliveryText;
        }
      }

      setupAccordions() {
        this.accordionButtons = Array.from(this.querySelectorAll('[data-accordion-button]'));
        if (!this.accordionButtons.length) return;

        this.accordionButtons.forEach((button) => {
          const panelId = button.getAttribute('aria-controls');
          const panel = panelId ? this.querySelector(`#${panelId}`) : null;
          if (!panel) return;

          if (button.getAttribute('aria-expanded') === 'true') {
            panel.hidden = false;
            panel.style.height = 'auto';
          } else {
            panel.hidden = true;
            panel.style.height = '0px';
          }

          button.addEventListener('click', () => {
            const isExpanded = button.getAttribute('aria-expanded') === 'true';
            this.toggleAccordion(panel, button, !isExpanded);
          });
        });
      }

      toggleAccordion(panel, button, shouldOpen) {
        if (shouldOpen) {
          panel.hidden = false;
          panel.style.height = '0px';
          button.setAttribute('aria-expanded', 'true');

          requestAnimationFrame(() => {
            panel.style.height = `${panel.scrollHeight}px`;
          });

          panel.addEventListener(
            'transitionend',
            () => {
              panel.style.height = 'auto';
            },
            { once: true }
          );
          return;
        }

        panel.style.height = `${panel.scrollHeight}px`;
        button.setAttribute('aria-expanded', 'false');

        requestAnimationFrame(() => {
          panel.style.height = '0px';
        });

        panel.addEventListener(
          'transitionend',
          () => {
            panel.hidden = true;
          },
          { once: true }
        );
      }
    }
  );
}
