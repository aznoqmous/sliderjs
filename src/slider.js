import Element from "./element"
import MathUtils from "./math-utils"

export default class Slider extends Element {

    constructor(container, opts = {}) {
        super(container, Object.assign({
            itemsContainer: null,
            itemsParent: null,
            items: null,
            transition: "transform 0.4s cubic-bezier(0.25,1,0.5,1) 0s",
            mouse: true,
            touch: true,
            clickDragTimeout: 250, // in ms, under this value triggers a click, over this value triggers a drag
            minDragDistance: 0,
            inlineStyle: true,
            loop: false,
            autoHeight: false,
            autoPlay: false, // autoPlay: {seconds}
            carousel: false, // carousel: {pixels per second}
            clamp: false, // first element will stick to container left, last to right
        }, opts));
        this._loop()
        Time.tick()
    }

    build() {
        this.itemsContainer = this.opts.itemsContainer ? this.getElement(this.opts.itemsContainer) : this.container
        this.itemsParent = this.opts.itemsParent ? this.getElement(this.opts.itemsParent) : this.itemsContainer.children[0]
        this.items = this.opts.items ? this.getElements(this.opts.items) : Array.from(this.itemsParent.children)

        if(this.opts.inlineStyle){
            this.itemsParent.style.display = "flex"
            this.itemsParent.style.width = "fit-content"
        }


        this.touchStartX = null
        this.targetLeft = 0

        this.swipeMin = 0.3 // go to next slide if touchDistX > (slide with * this value)
        this.autoSwipeMin = 20
        this.autoSwipeMax = window.innerWidth / 3

        this.itemsContainer.classList.add('slider')
        this.items.map(item => item.classList.add('slider-item'))

        this.offset = 0
        this.defaultItems = Array.from(this.items)

        this.update()
        this.offsetX = this.parentRect.left - this.containerRect.left

        this.activeIndex = 0
        this.activeItem = this.items[this.activeIndex]
        this.initialActiveItem = this.select(".active") || this.items[0]
        this.unfloorLeft()
        this.setItem(this.initialActiveItem)
        this.applyLeft()

        if (this.opts.autoPlay) this.autoPlay()
        if (this.opts.loop) this.buildLoop()
    }

    getElement(elementOrSelector) {
        return typeof elementOrSelector === "string" ? this.select(elementOrSelector) : elementOrSelector
    }

    getElements(elementOrSelector) {
        return typeof elementOrSelector === "string" ? this.selectAll(elementOrSelector) : elementOrSelector
    }

    get itemsCount() {
        return this.defaultItems.length
    }

    get isDrag() {
        return this.touchDistX > this.opts.minDragDistance
    }

    get touchDistX() {
        return this.lastX ? Math.abs(this.lastX - this.touchStartX) : 0
    }

    bind() {
        if (this.opts.touch) this.bindTouch()
        if (this.opts.mouse) this.bindMouse()

        this.lastWindowWidth = window.innerWidth
        window.addEventListener("resize", () => {
            if (this.lastWindowWidth != window.innerWidth) this.updateContainerSize()
            this.lastWindowWidth = window.innerWidth
        })
    }

    bindItems(eventName, callback) {
        this.items.map((item) => item.addEventListener(eventName, (e) => callback(e, this.items.indexOf(item))))
        this.addEventListener(SliderEvents.AddItemEvent, (item) => {
            item.addEventListener(eventName, (e) => callback(e, this.items.indexOf(item)))
        })
    }

    bindMouse() {
        this.bindItems('mousedown', (e, i) => {
            this.moved = false
            this.mouseDownTime = performance.now()
            this.mouseDownItem = this.items[i]

            this.unfloorLeft()
            window.addEventListener('mousemove', mouseMove, {passive: false})
        })

        this.bindItems('click', (e) => {
            if (this.moved) e.preventDefault()
        })

        const mouseMove = (e) => {
            e.preventDefault()

            this.moved = true

            if (!this.lastX) {
                this.touchStartX = e.clientX
                this.lastX = this.touchStartX
            }

            this.targetLeft += this.lastX - e.clientX
            this.applyLeft()
            this.lastX = e.clientX
        }

        this.itemsContainer.addEventListener('mouseup', () => {
            if (!this.lastX && !this.mouseDownItem) return;
            if (!this.isDrag) {
                this.setItem(this.mouseDownItem)
                this.floorLeft()
            } else {
                this.play()
            }
            this.mouseDownItem = null
            this.lastX = null
            window.removeEventListener('mousemove', mouseMove)
        })

        this.itemsContainer.addEventListener('mouseenter', () => {
            this.stopAutoPlay()
        })

        this.itemsContainer.addEventListener('mouseleave', () => {
            if (this.opts.autoPlay) this.autoPlay()
            if (!this.lastX) return;
            this.play()
            this.mouseDownItem = null
            this.lastX = null
            window.removeEventListener('mousemove', mouseMove)
        })

        window.addEventListener('mouseleave', () => window.removeEventListener("mousemove", mouseMove))
    }

    _loop() {

        if (this.opts.carousel) {
            const activeIndex = this.activeIndex
            this.targetLeft += Time.deltaTime * this.opts.carousel
            this.applyLeft()
            this.activeIndex = this.calculateActiveIndex()
            this.activeItem = this.items[this.activeIndex]
            if(activeIndex != this.activeIndex) this.balanceLoop()
            //this.updateItemsClass()
        }

        else if (this.opts.loop) {
            this.balanceLoop()
        }

        this.activeIndex = this.calculateActiveIndex()
        this.activeItem = this.items[this.activeIndex]
        this.updateItemsClass()

        requestAnimationFrame(this._loop.bind(this))
    }

    balanceLoop() {
        const activeLeft = this.activeItem.getBoundingClientRect().left
        this.update()
        const center = this.containerRect.left + this.containerRect.width / 2
        const left = center - this.parentRect.left
        const right = this.parentRect.left + this.parentRect.width - center

        const dist = Math.abs(left - right)

        if (left < right) {
            const lastElement = this.items[this.items.length - 1]
            const lastElementWidth = lastElement.getBoundingClientRect().width
            if (lastElementWidth < dist / 2) {
                this.itemsParent.prepend(lastElement)
                this.items = Array.from(this.itemsParent.children)
                this.targetLeft -= activeLeft - this.activeItem.getBoundingClientRect().left
                this.floorLeft()
                this.applyLeft()
                this.unfloorLeft()
            }
        } else {
            const firstElement = this.items[0]
            const firstElementWidth = firstElement.getBoundingClientRect().width
            if (firstElementWidth < dist / 2) {
                this.itemsParent.append(firstElement)
                this.items = Array.from(this.itemsParent.children)
                this.targetLeft -= activeLeft - this.activeItem.getBoundingClientRect().left
                this.floorLeft()
                this.applyLeft()
                this.unfloorLeft()
            }
        }
    }

    bindTouch() {
        this.bindItems('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX
            this.lastX = this.touchStartX
            this.unfloorLeft()
        })

        this.itemsContainer.addEventListener('touchmove', (e) => {
            const delta = this.lastX - e.touches[0].clientX
            this.targetLeft += delta
            this.applyLeft()
            this.lastX = e.touches[0].clientX

            // https://github.com/akiran/react-slick/issues/1240
            if(Math.abs(delta) > 5){
                e.preventDefault()
                e.returnValue = false
                return false
            }
        }, {
            passive: false,
        })
        this.itemsContainer.addEventListener('touchend', () => {
            this.play()
        })
    }

    setIndex(index) {
        this._setIndex(index)
        this.floorLeft()
    }

    prev() {
        this.move(-1)
    }

    next() {
        this.move(1)
    }

    move(index) {
        this.setIndex(this.activeIndex + index)
    }

    play(offset = 0) {
        this.offset = offset
        this.containerRect = this.itemsContainer.getBoundingClientRect()
        this.setNearestTarget()
        this.floorLeft()
    }

    setItem(item, force = false) {
        if (!force && this.activeItem === item) return;
        this._setIndex(this.items.indexOf(item))
    }

    getTargetLeft(item) {
        const rect = item.getBoundingClientRect()
        return rect.left
            + rect.width / 2
            - this.containerRect.width / 2
            - this.containerRect.left
            + this.targetLeft
    }

    _setIndex(index) {
        const oldIndex = this.activeIndex
        const activeIndex = MathUtils.clamp(index, 0, this.items.length - 1)
        const activeItem = this.items[activeIndex]
        this.targetLeft = this.getTargetLeft(activeItem)
        if (this.opts.clamp) {
            this.targetLeft = MathUtils.clamp(this.targetLeft, 0, this.parentRect.width - this.containerRect.width + this.offsetX * 2)
        }
        if (this.opts.autoHeight) this.itemsContainer.style.height = activeItem.getBoundingClientRect().height + "px"

        if (this.activeIndex !== oldIndex) this.dispatchEvent(new SliderChangeEvent(activeItem, activeIndex))
    }

    applyLeft() {
        this.itemsParent.style.transform = `translateX(${-this.targetLeft}px)`
    }

    unfloorLeft() {
        this.itemsParent.style.transition = null
        this.itemsParent.style.userSelect = "none"
    }

    floorLeft() {
        this.applyLeft()
        this.itemsParent.style.transition = this.opts.transition
        this.itemsParent.style.userSelect = null
        this.updateItemsClass()
    }

    setNearestTarget() {
        if (this.opts.clamp && !this.isDrag) return;
        if (this.opts.clamp && !this.isDrag) return;
        const index = this.calculateActiveIndex()
        this._setIndex(index + this.offset)
    }

    calculateActiveIndex() {
        const centers = this.items.map(item => {
            item.rect = item.getBoundingClientRect()
            return item.rect.left + item.rect.width / 2 - this.containerRect.width / 2 - this.containerRect.left
        })
        const centersSorted = Array.from(centers)
        const nearest = centersSorted.sort((a, b) => Math.abs(a) - Math.abs(b))[0]
        const index = centers.indexOf(nearest)
        return index
    }

    update() {
        this.updateItemsRect()
        this.updateContainerSize()
    }

    updateItemsClass() {
        this.items.map(item => item.classList.toggle('active', this.activeItem == item))
        this.items.map(item => item.classList.toggle('visible', item.rect.left + item.rect.width > this.containerRect.left && item.rect.left < this.containerRect.left + this.containerRect.width))
    }

    updateItemsRect() {
        this.items.map(item => item.rect = item.getBoundingClientRect())
    }

    updateContainerSize() {
        this.containerRect = this.itemsContainer.getBoundingClientRect()
        this.parentRect = this.itemsParent.getBoundingClientRect()
        this.container.style.setProperty("--container-width", this.containerRect.width + "px")
        this.container.style.setProperty("--container-height", this.containerRect.height + "px")
    }

    stopAutoPlay() {
        if (this.autoPlayTimeout) clearTimeout(this.autoPlayTimeout)
    }

    autoPlay() {
        this.stopAutoPlay()
        this.autoPlayTimeout = setTimeout(() => {
            this.next()
            this.autoPlay()
        }, this.opts.autoPlay * 1000)
    }

    buildLoop() {
        const cloneLoop = () => {
            const width = this.parentRect.width
            this.cloneItems()
            this.update()
            if (width === this.parentRect.width) return;
            if (this.parentRect.width / 4 < window.innerWidth) cloneLoop()
            if (width === this.parentRect.width) return;
            if (this.parentRect.width / 4 < window.innerWidth) cloneLoop()
        }
        cloneLoop()
        this.setItem(this.items[this.activeIndex + this.defaultItems.length])
        this.applyLeft()
        this.balanceLoop()
    }

    cloneItems() {
        this.defaultItems.map(item => this.addItem(item.cloneNode(true)))
    }

    addItem(item) {
        this.items.push(item)
        this.itemsParent.append(item)
        this.dispatchEvent(new SliderAddItem(item))
    }
}

export const SliderEvents = {
    ChangeEvent: "sliderChange",
    AddItemEvent: "sliderAddItem",
}

export class SliderChangeEvent extends Event {
    constructor(activeItem, activeIndex) {
        super(SliderEvents.ChangeEvent)
        this.item = activeItem
        this.index = activeIndex
    }
}

export class SliderAddItem extends Event {
    constructor(item) {
        super(SliderEvents.AddItemEvent)
        this.item = item
    }
}

export class Time {
    static get deltaTime() {
        return this._deltaTime || 0
    }

    static tick() {
        if (this._lastFrame) return;
        this._lastFrame = Date.now()
        const loop = () => {
            this._deltaTime = Math.min(1, (Date.now() - this._lastFrame) / 1000)
            this._lastFrame = Date.now()
            requestAnimationFrame(loop)
        }
        loop()
    }
}