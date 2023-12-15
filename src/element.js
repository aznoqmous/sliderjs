export default class Element extends EventTarget {
    constructor(container, opts={}) {
        super()
        if(container[this.constructor.name]) return;
        this.container = container
        this.container[this.constructor.name] = this
        this.opts = opts

        this.build()
        this.bind()
        this.start()
    }

    build(){}
    bind(){}
    start(){}

    select(selector){
        return this.container.querySelector(selector)
    }
    selectAll(selector){
        return Array.from(this.container.querySelectorAll(selector))
    }
    create(tagName="div", attributes={}, parent=null){
        const element = document.createElement(tagName)
        for(let key in attributes) element[key] = attributes[key]
        if(parent) parent.append(element)
        return element
    }
    static bind(selector, opts={}){
        document.querySelectorAll(selector).forEach((el)=> new this(el, opts))
    }
}