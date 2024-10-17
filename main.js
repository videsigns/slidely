class Slidely {
    constructor(selector, index) {
        this.sliderWrapper = selector;
        if (!this.sliderWrapper) {
            console.error('Slider wrapper not found');
            return; // Exit constructor if slider wrapper is not found
        }

        this.backBtn = this.sliderWrapper.querySelector('[vds-slider="back-button"]');
        this.nextBtn = this.sliderWrapper.querySelector('[vds-slider="next-button"]');
        this.currentSlide = this.sliderWrapper.querySelector('[vds-slider="current-slide"]');
        this.totalSlide = this.sliderWrapper.querySelector('[vds-slider="total-slide"]');
        this.bulletIndicatorWrapper = this.sliderWrapper.querySelector(
            '[vds-slider="bullet-wrapper"]');
        this.slider = this.sliderWrapper.querySelector('[vds-slider="true"]');
        this.sliderItems = this.slider ? this.slider.children : null;
        this.scroller = this.sliderWrapper.querySelector('[vds-slider="scrollbar"]');
        this.scrollBarWrapper = this.sliderWrapper.querySelector(
            '[vds-slider="scrollbar-wrapper"]');

        this.options = {
            perView: parseInt(this.slider.getAttribute('vds-slider-per-view')) || 3,
            perMove: parseInt(this.slider.getAttribute('vds-slider-per-move')) || 1,
            ignoreError: this.slider.hasAttribute('vds-slider-ignore-error'),
            loop: this.slider.hasAttribute('vds-slider-loop'),
            autoplay: this.slider.hasAttribute('vds-slider-autoplay'),
            pauseOnHover: this.slider.hasAttribute('vds-slider-pause'),
            interval: parseInt(this.slider.getAttribute('vds-slider-interval')) || 3000,
            isCenter: this.slider.hasAttribute('vds-slider-center'),
            speed: parseInt(this.slider.getAttribute('vds-slider-speed')) || 500,
            easing: this.slider.getAttribute('vds-slider-easing') || 'ease',
            initialIndex: parseInt(this.slider.getAttribute('vds-slider-start')) || 0,
            draggable: this.slider.hasAttribute('vds-slider-drag'),
            isNavigating: null, // Placeholder for navigation functionality
            perViewMobile: parseInt(this.slider.getAttribute('vds-slider-per-view-mobile')) || 1,
            perMoveMobile: parseInt(this.slider.getAttribute('vds-slider-per-move-mobile')) || 1,
            perViewTablet: parseInt(this.slider.getAttribute('vds-slider-per-view-tablet')) || 1,
            perMoveTablet: parseInt(this.slider.getAttribute('vds-slider-per-move-tablet')) || 1
        };
        this.currentIndex = this.options.initialIndex
        this.firstLoad = true;
        this.totalViewAndMove = 0
        this.sliderWidth = 0

        this.adjustOptionsForViewport();

        // Check if back button, next button, bullet indicator, scroller, and scroll bar wrapper are missing
        if (!this.backBtn && !this.options.ignoreError) {
            console.error('Error on slider #' + index + ' : Back button element not found');
        }
        if (!this.nextBtn && !this.options.ignoreError) {
            console.error('Error on slider #' + index + ' : Next button element not found');
        }
        if (!this.totalSlide && !this.options.ignoreError) {
            console.error('Error on slider #' + index + ' : Total slide element not found');
        }
        if (!this.currentSlide && !this.options.ignoreError) {
            console.error('Error on slider #' + index + ' : Current slide element not found');
        }
        if (!this.bulletIndicatorWrapper && !this.options.ignoreError) {
            console.error('Error on slider #' + index +
                ' : Bullet indicator wrapper element not found');
        }
        if (!this.scroller && !this.options.ignoreError) {
            console.error('Error on slider #' + index + ' : Scroller element not found');
        }
        if (!this.scrollBarWrapper && !this.options.ignoreError) {
            console.error('Error on slider #' + index + ' : Scroll bar wrapper element not found');
        }

        // Check if slider or slider items are missing
        if (!this.slider || !this.sliderItems && !this.options.ignoreError) {
            console.error('Error on slider #' + index + ' :Slider or slider items not found');
            return; // Exit constructor if slider or slider items are not found
        }

        this.initializeSliderPromise = this.initializeSlider().then(() => this);
        if (this.backBtn) {
            this.backBtn.addEventListener('click', this.prevSlide.bind(this));
        }
        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', this.nextSlide.bind(this));
        }
        if (this.scroller) {
            this.scroller.addEventListener('mousedown', this.handleScrollerDrag.bind(this));
        }

        // Start autoplay if enabled
        if (this.options.autoplay) {
            this.startAutoplay();
        }

        // Initialize each slider instance
        this.initializeSliderPromise.then(() => {
            // Add is-active class to visible sliders on load
            this.showSlide(this.currentIndex + (this.options.perView - 1));
        });

        // Add event listeners for mouse and touch events on the slider
        if (this.options.draggable && this.slider) {
            this.slider.addEventListener('mousedown', this.handleDragStart.bind(this));
            this.slider.addEventListener('touchstart', this.handleDragStart.bind(this));
            this.slider.addEventListener('mousemove', this.handleDragMove.bind(this));
            this.slider.addEventListener('touchmove', this.handleDragMove.bind(this));
            this.slider.addEventListener('mouseup', this.handleDragEnd.bind(this));
            this.slider.addEventListener('touchend', this.handleDragEnd.bind(this));
        }

        // Bind methods to the instance
        this.beforeChange = this.beforeChange.bind(this);
        this.afterChange = this.afterChange.bind(this);

        this.beforeChangeHandlers = [];
        this.afterChangeHandlers = [];

        if (this.bulletIndicatorWrapper) {
            this.bulletIndicator = Array.from(this.bulletIndicatorWrapper.children);
        }

        return this.initializeSliderPromise; // Return the promise
    }

    // Method to add beforeChange event handler
    beforeChange(handler) {
        this.beforeChangeHandlers.push(handler);
    }

    // Method to add afterChange event handler
    afterChange(handler) {
        this.afterChangeHandlers.push(handler);
    }

    adjustOptionsForViewport() {
        const screenWidth = window.innerWidth;
        if (screenWidth > 430 && screenWidth <= 768) { // Tablet and below
            this.options.perView = this.options.perViewTablet;
            this.options.perMove = this.options.perMoveTablet;
        } else if (screenWidth <= 430) { // Mobile
            console.log('mobile')
            this.options.perView = this.options.perViewMobile;
            this.options.perMove = this.options.perMoveMobile;
        }
    }

    resetIndicator(number) {
        // Calculate the remainder when dividing the number by 4
        const remainder = (number) % this.totalViewAndMove;

        // If the remainder is negative, add 4 to make it positive
        const positiveRemainder = remainder < 0 ? remainder + this.totalViewAndMove : remainder;

        // Add 1 to make the range start from 1 instead of 0
        return positiveRemainder === 0 ? this.sliderItems.length / 2 : positiveRemainder;
    }

    showSlide(index) {
        // Trigger beforeChange event handlers
        // this.beforeChangeHandlers.forEach(handler => handler(this.currentIndex, this.currentIndex + 1));

        if (!this.sliderItems) return;

        // Update currentIndex
        this.currentIndex = index;

        // Calculate the position for the continuous sliding
        let offset = (-index * (100 / this.options.perView)) * this.options.perMove;
        this.slider.style.transition = `transform ${this.options.speed}ms ${this.options.easing}`;
        this.slider.style.transform = `translateX(${offset}%)`;
        console.log(offset)
            // Handle looping logic

        console.log(this.currentIndex, (index - (this.options.perView - 2)), this.sliderItems.length /
                2)
            // Handle forward loop
        if ((index - (this.options.perView - 2)) >= this.sliderItems.length / 2) {
            this.slider.style.transition = 'none'; // Disable transitions temporarily
            this.slider.style.transform = `translateX(-${(100 / this.options.perView)}%)`;
            setTimeout(() => {
                this.slider.style.transition = ''; // Re-enable transitions
                this.currentIndex = this.options.perView / 2; // Adjust index to correct position
                let offset = (-this.currentIndex * (100 / this.options.perView)) * this.options
                    .perMove;
                console.log(offset)
                this.slider.style.transform = `translateX(${offset}%)`;
            }, 0);
        }
        // Handle backward loop
        else if (index < 1) {
            this.slider.style.transition = 'none'; // Disable transitions temporarily
            this.slider.style.transform =
                `translateX(-${(100 / this.options.perView) * ((this.sliderItems.length / 2)+1)}%)`;
            setTimeout(() => {
                this.slider.style.transition = ''; // Re-enable transitions
                this.currentIndex = this.sliderItems.length / 2; // Adjust index to correct position
                let offset = (-this.currentIndex * (100 / this.options.perView)) * this.options
                    .perMove
                console.log(offset)
                this.slider.style.transform = `translateX(${offset}%)`;
            }, 0);
        }

        console.log(this.currentIndex)

        console.log(index)
        let indicatorIndex = index - (this.options.perView - 2)
        if ((index - (this.options.perView - 2)) < 1) {
            indicatorIndex = this.resetIndicator(index - (this.options.perView - 2))
        } else {
            indicatorIndex = index - (this.options.perView - 2);
        }

        // Update current slide indicator
        if (this.currentSlide) {
            this.currentSlide.textContent = indicatorIndex; // Display 1-based index
        }

        // Update bullet indicators
        if (this.bulletIndicatorWrapper) {
            this.updateBulletIndicator(indicatorIndex - 1);
        }

        // Update scroller position
        if (this.scroller && this.scrollBarWrapper) {
            this.updateScrollerPosition(indicatorIndex - 1);
        }

        // Add is-active class to visible sliders
        for (let i = 0; i < this.sliderItems.length; i++) {
            if (i >= index && i < index + this.options.perView) {
                this.sliderItems[i].classList.add('is-active');
            } else {
                this.sliderItems[i].classList.remove('is-active');
            }
        }

        // Trigger afterChange event handlers
        // this.afterChangeHandlers.forEach(handler => handler(this.currentIndex));
    }

    async initializeSlider() {
        return new Promise((resolve, reject) => {
            if (this.bulletIndicatorWrapper) {
                const referenceBullet = this.bulletIndicatorWrapper.querySelectorAll('*')[0];
                let totalItems = 0

                if (this.options.loop) {
                    totalItems = this.sliderItems.length - 1
                } else {
                    totalItems = Math.ceil((this.sliderItems.length - this.options.perView) / this
                        .options.perMove)
                }

                this.totalViewAndMove = totalItems + 1

                for (let i = 0; i <= totalItems; i++) {
                    const clonedBullet = referenceBullet.cloneNode(true);
                    this.bulletIndicatorWrapper.appendChild(clonedBullet);
                    if (clonedBullet.textContent) {
                        clonedBullet.textContent = i + 1
                    }
                }
                referenceBullet.remove()

                this.bulletIndicator = this.bulletIndicatorWrapper.querySelectorAll('*');
                this.bulletIndicator.forEach((bullet, index) => {
                    bullet.addEventListener('click', () => {
                        this.showSlide(index);
                    });
                });

                if (this.totalSlide) {
                    this.totalSlide.textContent = this.totalViewAndMove
                }
                if (this.currentSlide) {
                    this.currentSlide.textContent = this.currentIndex + 1
                }

                this.updateBulletIndicator(0);
            }

            const numSlides = this.sliderItems.length;

            if (this.options.perView === 1) {
                for (let i = 0; i < numSlides; i++) {
                    this.sliderItems[i].style.width = '100%';
                }
            } else {
                const computedStyle = getComputedStyle(this.slider);

                // Check if the element uses grid-gap or just gap
                const gapValue = parseFloat(computedStyle.getPropertyValue('grid-column-gap') ||
                    computedStyle.getPropertyValue('gap'));

                // Set slider gap to 0
                this.slider.style.gap = '0';

                // Calculate slider width based on perView
                this.sliderWidth = 100 / this.options.perView;

                // Loop through slider items
                for (let i = 0; i < numSlides; i++) {
                    this.sliderItems[i].style.width = `${this.sliderWidth}%`;
                    this.sliderItems[i].style.paddingLeft = `${gapValue / 2}px`;
                    this.sliderItems[i].style.paddingRight = `${gapValue / 2}px`;
                }
            }

            if (this.options.loop) {
                // Select the list items within the slider
                var items = this.slider.querySelectorAll('.blog-card');
                var len = items.length;

                if (len > 0) {
                    // Calculate the number of items to clone based on perView
                    var cloneCount = len / 2;

                    // Clone and insert the required number of items at the beginning
                    for (var i = 0; i < cloneCount; i++) {
                        var itemToClone = items[len - cloneCount + i];
                        var clone = itemToClone.cloneNode(true);
                        this.slider.insertBefore(clone, items[0]);
                    }

                    // Clone and append the required number of items at the end
                    for (var i = 0; i < cloneCount; i++) {
                        var itemToClone = items[i];
                        var clone = itemToClone.cloneNode(true);
                        this.slider.appendChild(clone);
                    }
                }

                this.slider.style.transition = 'none'; // Disable transitions temporarily
                this.slider.style.transform =
                    `translateX(-${(100 / this.options.perView)}%)`;
                setTimeout(() => this.slider.style.transition = '', 0); // Re-enable transitions
            }

            if (this.scroller && this.scrollBarWrapper) {
                this.updateScrollerWidth();
                this.updateScrollerPosition();
            }

            if (this.options.isCenter && this.firstLoad) {
                this.showSlide(Math.round((Math.ceil((this.sliderItems.length - this.options
                    .perView) / this.options.perMove) / 2)));

                this.firstLoad = false;
            }

            resolve(); // Resolve the promise once initialization is complete
        });
    }

    async nextSlide() {
        if (this.options.isNavigating) {
            this.options.isNavigating.then(x => x.nextBtn.click())
        }
        this.showSlide(this.currentIndex + 1);
    }

    async prevSlide() {
        if (this.options.isNavigating) {
            this.options.isNavigating.then(x => x.backBtn.click())
        }
        this.showSlide(this.currentIndex - 1);
    }

    updateBulletIndicator(index) {
        const initialNumSlides = this.sliderItems.length;
        if (!this.bulletIndicator || !this.bulletIndicator.length) {
            return; // Exit if bullet indicators are not defined or empty
        }

        for (let i = 0; i < this.bulletIndicator.length; i++) {
            this.bulletIndicator[i].classList.remove('is-active');
        }

        this.bulletIndicator[index].classList.add('is-active')
    }

    updateScrollerWidth() {
        if (this.scroller && this.scrollBarWrapper) {
            const numSlides = this.sliderItems.length;
            const scrollerWidth = (100 / this.totalViewAndMove)
            this.scroller.style.width = `${scrollerWidth}%`;
        }
    }

    updateScrollerPosition(index) {
        const initialNumSlides = this.sliderItems.length;
        if (this.scroller && this.scrollBarWrapper) {
            const offsetPercentage = (100 / this.totalViewAndMove) * index
            this.scroller.style.left = `${offsetPercentage}%`;
        }
    }

    handleScrollerDrag(event) {
        event.preventDefault();
        const startX = event.clientX;
        const startLeft = parseFloat(getComputedStyle(this.scroller).left);
        const trackInnerWidth = this.scrollBarWrapper.offsetWidth - this.scroller.offsetWidth;

        let lastDeltaX = 0; // Keep track of the previous deltaX

        const mouseMoveHandler = (event) => {
            const deltaX = event.clientX - startX;

            // Apply damping factor
            const dampingFactor = 0.01; // Adjust this value for desired damping effect
            const smoothedDeltaX = (deltaX + lastDeltaX) /
                2; // Smooth the movement by averaging with the previous deltaX
            lastDeltaX = smoothedDeltaX;

            let newLeft = startLeft + smoothedDeltaX;

            // Ensure newPosition stays within bounds
            newLeft = Math.min(Math.max(newLeft, 0), trackInnerWidth);

            // Calculate the slideIndex based on the scroller's position
            const numSlides = this.sliderItems.length;
            const perSlideWidth = trackInnerWidth / this.totalViewAndMove;
            let slideIndex = Math.floor(newLeft / perSlideWidth);

            // Adjust slideIndex to stay at the last slide if scroller hits maximum width
            if (slideIndex + this.options.perView > numSlides) {
                slideIndex = numSlides - this.options.perView;
            }

            this.showSlide(slideIndex);

            // Convert newLeft to percentage
            const newPositionPercentage = (newLeft / trackInnerWidth) * 100;

            // Update scroller position continuously with percentage
            this.updateScrollerPosition(newPositionPercentage);
        };

        const mouseUpHandler = () => {
            document.removeEventListener('mousemove', mouseMoveHandler);
            document.removeEventListener('mouseup', mouseUpHandler);
        };

        document.addEventListener('mousemove', mouseMoveHandler);
        document.addEventListener('mouseup', mouseUpHandler);
    }

    handleDragStart(event) {
        event.preventDefault();
        this.dragStartX = event.clientX || event.touches[0].clientX;
        this.dragStartIndex = this.currentIndex;
        this.dragging = true;
        this.slider.style.transition = 'none';
    }

    handleDragMove(event) {
        event.preventDefault();
        if (!this.dragging) return;
        const currentX = event.clientX || event.touches[0].clientX;
        const diffX = currentX - this.dragStartX;
        const numSlides = this.sliderItems.length;
        const slideWidth = this.slider.offsetWidth / numSlides;
        const moveDistance = diffX / slideWidth;

        // Only move to the next slide if the drag distance exceeds half of the slide width
        if (Math.abs(moveDistance) >= 0.5) {
            const moveCount = Math.floor(moveDistance);
            this.showSlide(this.dragStartIndex - moveCount);
        }
    }

    handleDragEnd(event) {
        event.preventDefault();
        this.dragging = false;
        this.slider.style.transition = `transform ${this.options.speed}ms ${this.options.easing}`;
        this.showSlide(this.currentIndex);
    }

    startAutoplay() {
        // Clear existing interval if it exists
        if (this.autoplayInterval) {
            clearInterval(this.autoplayInterval);
        }

        this.autoplayInterval = setInterval(() => {
            this.nextSlide();
        }, this.options.interval);

        // Pause autoplay on hover if enabled
        if (this.options.pauseOnHover) {
            this.sliderWrapper.addEventListener('mouseenter', () => {
                clearInterval(this.autoplayInterval);
            });

            this.sliderWrapper.addEventListener('mouseleave', () => {
                this.startAutoplay();
            });
        }
    }
}

// Initialize each slider instance
// const sliders = document.querySelectorAll('[vds-slider-wrapper="true"]');
// sliders.forEach((slider, i) => new Slidely(slider, i));