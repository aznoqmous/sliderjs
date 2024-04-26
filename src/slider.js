
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
            fitContainer: false, // force item sizes to take full container
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

        if(this.opts.fitContainer) this.items.map(item => {
            item.style.width = "var(--container-width)"
            item.style.height = "var(--container-height)"
        })

        this.updateContainerSize()
        this.play()
    }


    bind() {
        if(this.opts.touch) this.bindTouch()
        if(this.opts.mouse) this.bindMouse()

        window.addEventListener("resize", ()=> this.updateContainerSize())
    }

    bindItems(eventName, callback){
        this.items.map((item, index) => item.addEventListener(eventName, (e)=> callback(e, index)))
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

            if(this.touchDistX < 30)
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

        this.itemsContainer.addEventListener('mouseleave', ()=>{
            if(!this.lastX) return;
            this.play()
            this.lastX = null
            window.removeEventListener('mousemove', mouseMove)
        })
    }

    get touchDistX(){
        return this.lastX ? Math.abs(this.lastX - this.touchStartX) : 0
    }


    _loop(){
        if(!this.mouseDownItem){
            const currentOffsetX = this.items[0].getBoundingClientRect().left 
            if(currentOffsetX == this._lastOffsetX){
                if(!this._loopFloored){
                    this.setNearestTarget()
                    this.floorLeft()
                    this._loopFloored = true
                }
            }
            else {
                this._loopFloored = false
            }
            this._lastOffsetX = currentOffsetX
        }
        
        requestAnimationFrame(this._loop.bind(this))
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
        console.log(item)
        this.setIndex(this.items.indexOf(item))
    }
    setIndex(index){
        this.activeIndex = MathUtils.clamp(index, 0, this.items.length - 1)
        this.activeItem = this.items[this.activeIndex]
        this.activeItem.rect = this.activeItem.getBoundingClientRect()
        this.targetLeft =
            this.activeItem.rect.left
            + this.activeItem.rect.width / 2
            - this.containerRect.width / 2
            - this.containerRect.left
            + this.targetLeft
    }

    applyLeft(){
        this.itemsParent.style.transform = `translateX(${-this.targetLeft}px)`
        this.dispatchEvent(new SliderChangeEvent(this.activeItem, this.activeIndex))
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

    updateContainerSize(){
        this.containerRect = this.itemsContainer.getBoundingClientRect()
        this.container.style.setProperty("--container-width", this.containerRect.width + "px")
        this.container.style.setProperty("--container-height", this.containerRect.height + "px")
    }
}

export const SliderEvents = {
    ChangeEvent: "change"
}

export class SliderChangeEvent extends Event {
    constructor(activeItem, activeIndex) {
        super(SliderEvents.ChangeEvent);
        this.item = activeItem
        this.index = activeIndex
    }
}