# sliderjs

A minimalistic out-of-the-box slider aiming for easy customization using js and css.

## How to use
In the following examples, class names are suggestive.  
You can in fact create a slider without any class names.

### Basic use case
Following the structure below, `sliderjs` will automatically set `items-parent` and `slider-item`
```html
<div class="items-container">
    <div class="items-parent">
        <div class="slider-item">
            <!-- slider item content -->
        </div>
        <div class="slider-item">
            <!-- slider item content -->            
        </div>
        <div class="slider-item">
            <!-- slider item content -->            
        </div>
        <div class="slider-item">
            <!-- slider item content -->            
        </div>
    </div>
</div>
<script>
    new Slider(".items-container")
</script>
```
### More complex use case

```html
<div class="items-container">
    <div>
    </div>
    <div>
        <div class="items-parent">
            <div class="slider-item">
                <!-- slider item content -->
            </div>
            <div></div>
            <div class="slider-item">
                <!-- slider item content -->            
            </div>
            <div></div>
            <div class="slider-item">
                <!-- slider item content -->            
            </div>
            <div></div>
            <div class="slider-item">
                <!-- slider item content -->            
            </div>
            <div></div> 
        </div>
    </div> 
    
</div>
<script>
    new Slider(".items-container", {
        itemsParent: ".items-parent",
        items: ".slider-item"
    })
</script>
```

## Basic styles
You must follow those minimum css rules to integrate `sliderjs` :
```scss
.items-container {
    /**
     * Avoid horizontal positioning rules
     * (ie. display:flex and justify-content:center)
     */
    .items-parent {
        display: flex;
        width: fit-content;
        .slider-item {
            
        }
    }
}
```

## Configuration
```js
{
    itemsContainer: null, // provide a custom element or selector as items-container
    itemsParent: null, // provide a custom element or selector as items-parent
    items: null, // provide custom elements or selector as items 
    transition: "transform 0.4s cubic-bezier(0.25,1,0.5,1) 0s",

    mouse: true, // enable mouse control
    touch: true, // enable touch control
    
    // in ms, under this value triggers a click, over this value triggers a drag
    clickDragTimeout: 250, 
    minDragDistance: 0,

    inlineStyle: true, // add default inline style to itemsParent

    loop: false, // seamlessly loop the slider
    autoHeight: false, // automatically resize the slider according to active slide height
    autoPlay: false, // autoPlay: {seconds}
    carousel: false, // carousel: {pixels per second}
    clamp: false, // first element will stick to container left, last to right
}
```