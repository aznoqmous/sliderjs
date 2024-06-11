
import Element from "./element"
import MathUtils from "./math-utils";

export default class Slider extends Element {

    constructor(container, opts={}) {
        super(container, Object.assign({
            itemsContainer: null,
            itemsParent: null,
            items: null,
            transition: "transform 0.4s cubic-bezier(0.25,1,0.5,1) 0s",
            mouse: true,
            touch: true,
            clickDragTimeout: 250, // in ms, under this value triggers a click, over this value triggers a drag
            minDragDistance: 30,

            loop: false,
            autoHeight: false,
            autoPlay: false,
            clamp: false, // first element will stick to container left, last to right

        }, opts));
        this._loop()
    }

    build() {
        this.itemsContainer = this.opts.itemsContainer ? this.select(this.opts.itemsContainer) : this.container
        this.itemsParent = this.opts.itemsParent ? this.select(this.opts.itemsParent) : this.itemsContainer.children[0]
        this.items = this.opts.items ? this.selectAll(this.opts.items) : Array.from(this.itemsParent.children)

        this.touchStartX = null
        this.targetLeft = 0

        this.autoSwipeMin = 20
        this.autoSwipeMax = window.innerWidth / 3

        this.itemsContainer.classList.add('slider')
        this.items.map(item => item.classList.add('slider-item'))

        this.offset = 0
        this.defaultItems = Array.from(this.items)

        this.update()
        this.offsetX = this.parentRect.left - this.containerRect.left

        this.initialActiveItem = this.select(".active") || this.items[0]
        this.unfloorLeft()
        this.setItem(this.initialActiveItem)
        this.applyLeft()

        if(this.opts.loop) this.buildLoop()

        if(this.opts.autoPlay) this.autoPlay()
    }

    get itemsCount(){
        return this.defaultItems.length
    }

    get isDrag(){
        return this.touchDistX > this.opts.minDragDistance
    }

    get touchDistX(){
        return this.lastX ? Math.abs(this.lastX - this.touchStartX) : 0
    }

    bind() {
        if(this.opts.touch) this.bindTouch()
        if(this.opts.mouse) this.bindMouse()

        this.lastWindowWidth = window.innerWidth
        window.addEventListener("resize", ()=> {
            if(this.lastWindowWidth != window.innerWidth) this.updateContainerSize()
            this.lastWindowWidth = window.innerWidth
        })
    }

    bindItems(eventName, callback){
        this.items.map((item) => item.addEventListener(eventName, (e)=> callback(e, this.items.indexOf(item))))
        this.addEventListener(SliderEvents.AddItemEvent, (item)=> {
            item.addEventListener(eventName, (e)=> callback(e, this.items.indexOf(item)))
        })
    }

    bindMouse(){
        this.bindItems('mousedown', (e, i) => {
            this.mouseDownTime = performance.now()
            this.mouseDownItem = this.items[i]

            this.unfloorLeft()
            window.addEventListener('mousemove', mouseMove)
        })

        const mouseMove = (e) => {
            if(!this.lastX) {
                this.touchStartX = e.clientX
                this.lastX = this.touchStartX
            }

            this.targetLeft += this.lastX - e.clientX
            this.applyLeft()
            this.lastX = e.clientX
        }

        this.itemsContainer.addEventListener('mouseup', () => {
            if(!this.lastX && ! this.mouseDownItem) return;

            if(!this.isDrag)
            {
                this.setItem(this.mouseDownItem)
                this.floorLeft()
            }
            else {
                this.play()
            }
            this.mouseDownItem = null
            this.lastX = null
            window.removeEventListener('mousemove', mouseMove)
        })

        this.itemsContainer.addEventListener('mouseenter', ()=>{
            this.stopAutoPlay()
        })

        this.itemsContainer.addEventListener('mouseleave', ()=>{
            if(this.opts.autoPlay) this.autoPlay()
            if(!this.lastX) return;
            this.play()
            this.mouseDownItem = null
            this.lastX = null
            window.removeEventListener('mousemove', mouseMove)
        })
    }

    _loop(){
        if(!this.mouseDownItem){
            this.currentOffsetX = this.items[0].getBoundingClientRect().left
            if(Math.abs(this.currentOffsetX - this._lastOffsetX) < 1){
                if(!this._loopFloored){
                    this.setNearestTarget()
                    this.floorLeft()
                    this._loopFloored = true

                    if(this.opts.loop){
                        this.balanceLoop()
                    }
                }
            }
            else {
                this._loopFloored = false
            }
            this._lastOffsetX = this.currentOffsetX
        }

        requestAnimationFrame(this._loop.bind(this))
    }

    balanceLoop(){
        this.unfloorLeft()
        this.setItem(this.activeItem)
        this.applyLeft()
        this.currentOffsetX = this.items[0].getBoundingClientRect().left
        this.update()

        const center = this.containerRect.left + this.containerRect.width / 2
        const left = center - this.parentRect.left
        const right = this.parentRect.left + this.parentRect.width - center

        const dist = Math.abs(left - right)

        if(left < right){
            const lastElement = this.items[this.items.length-1]
            const lastElementWidth = lastElement.getBoundingClientRect().width
            if(lastElementWidth < dist / 2) {
                this.itemsParent.prepend(lastElement)
                this.items = Array.from(this.itemsParent.children)

                this.balanceLoop()
            }
        }
        else {
            const firstElement = this.items[0]
            const firstElementWidth = firstElement.getBoundingClientRect().width
            if(firstElementWidth < dist / 2) {
                this.itemsParent.append(firstElement)
                this.items = Array.from(this.itemsParent.children)

                this.balanceLoop()
            }
        }

    }

    bindTouch(){
        this.bindItems('touchstart', (e) => {
            this.touchStartX = e.touches[0].clientX
            this.lastX = this.touchStartX
            this.unfloorLeft()
        })
        this.itemsContainer.addEventListener('touchmove', (e) => {
            this.targetLeft += this.lastX - e.touches[0].clientX
            this.applyLeft()
            this.lastX = e.touches[0].clientX
        }, {
            passive: false,
        })
        this.itemsContainer.addEventListener('touchend', () => {
            this.play()
        })
    }

    prev(){
        this.setIndex(this.activeIndex-1)
        this.floorLeft()
    }

    next(){
        this.setIndex(this.activeIndex+1)
        this.floorLeft()
    }

    play(offset = 0) {
        this.offset = offset
        this.containerRect = this.itemsContainer.getBoundingClientRect()
        this.setNearestTarget()
        this.floorLeft()
    }

    setNearestTarget() {
        if(this.opts.clamp && !this.isDrag) return;
        const centers = this.items.map(item => {
            item.rect = item.getBoundingClientRect()
            return item.rect.left + item.rect.width / 2 - this.containerRect.width / 2 - this.containerRect.left
        })
        const centersSorted = Array.from(centers)
        const nearest = centersSorted.sort((a, b) => Math.abs(a) - Math.abs(b))[0]
        const index = centers.indexOf(nearest)
        this.setIndex(index + this.offset)
    }

    setItem(item){
        this.setIndex(this.items.indexOf(item))
    }

    setIndex(index){
        const oldIndex = this.activeIndex
        this.activeIndex = MathUtils.clamp(index, 0, this.items.length - 1)
        this.activeItem = this.items[this.activeIndex]
        this.activeItem.rect = this.activeItem.getBoundingClientRect()
        this.targetLeft =
            this.activeItem.rect.left
            + this.activeItem.rect.width / 2
            - this.containerRect.width / 2
            - this.containerRect.left
            + this.targetLeft

        if(this.opts.clamp){
            this.targetLeft = MathUtils.clamp(this.targetLeft, 0, this.parentRect.width - this.containerRect.width + this.offsetX * 2)
        }
        if(this.opts.autoHeight) this.itemsContainer.style.height = this.activeItem.getBoundingClientRect().height + "px"

        if(this.activeIndex != oldIndex) this.dispatchEvent(SliderEvents.ChangeEvent, this)
    }

    applyLeft(){
        this.itemsParent.style.transform = `translateX(${-this.targetLeft}px)`
    }

    unfloorLeft(){
        this.itemsParent.style.transition = null
        this.itemsParent.style.userSelect = "none"
    }

    floorLeft(){
        this.applyLeft()
        this.itemsParent.style.transition = this.opts.transition
        this.itemsParent.style.userSelect = null

        this.items.map(item => item.classList.toggle('active', this.activeItem == item))
        this.items.map(item => item.classList.toggle('visible', item.rect.left + item.rect.width > this.containerRect.left && item.rect.left < this.containerRect.left + this.containerRect.width))
    }

    update(){
        this.updateItemsRect()
        this.updateContainerSize()
    }

    updateItemsRect(){
        this.items.map(item => item.rect = item.getBoundingClientRect())
    }

    updateContainerSize(){
        this.containerRect = this.itemsContainer.getBoundingClientRect()
        this.parentRect = this.itemsParent.getBoundingClientRect()
        this.container.style.setProperty("--container-width", this.containerRect.width + "px")
        this.container.style.setProperty("--container-height", this.containerRect.height + "px")
    }

    stopAutoPlay(){
        if(this.autoPlayTimeout) clearTimeout(this.autoPlayTimeout)
    }

    autoPlay(){
        this.stopAutoPlay()
        this.autoPlayTimeout = setTimeout(()=> {
            this.next()
            this.autoPlay()
        }, this.opts.autoPlay * 1000)
    }

    buildLoop(){
        const cloneLoop = ()=>{
            this.cloneItems()
            this.update()
            if(this.parentRect.width / 4 < window.innerWidth) cloneLoop()
        }
        cloneLoop()
        this.setItem(this.items[this.activeIndex + this.defaultItems.length])
        this.applyLeft()
    }

    cloneItems(){
        this.defaultItems.map(item => this.addItem(item.cloneNode(true)))
    }

    addItem(item){
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
    constructor(item){
        super(SliderEvents.AddItemEvent)
        this.item = item
    }
}