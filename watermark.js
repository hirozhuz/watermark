class CreateWatermark {

    canvas = null
    ctx = null
    startX = 0
    startY = 0
    width = 0
    height = 0
    type = 'image/png'
    quality = 1

    index = -1

    src = ''

    padding = 10

    templates = []


    prevX = 0
    prevY = 0

    prevWidth = 0
    prevHeight = 0


    renderQueue = []

    DEFAULT_FONT_STYLE = {
        fontSize: 12,
        fontWeight: 'normal',
        fontFamily: 'sans-serif',
        color: '#fff',
        baseline: 'middle',
        textAlign: 'left'
    }

    constructor(options = {}) {
        this.canvas = document.createElement('canvas')
        this.ctx = this.canvas.getContext('2d')
        const {
            templates = [],
            padding = this.padding,
            dataType = 'image/png',
            quality = 1
        } = options

        this.dataType = dataType
        this.quality = quality
        this.templates = templates
        this.padding = padding
        // this.position = position
    }

    getPosition(type, range, margin = 0, target = 'prev', position) {
        const {renderQueue} = this

        const len = renderQueue.length
        const index = target === 'prev' ? len - 1 : target

        const item = renderQueue[index] || renderQueue[len - 1] || {x: 0, y: 0, width: 0, height: 0}

        const {x: prevX, y: prevY, width: prevWidth, height: prevHeight} = item

        let prevPosition = prevX
        let prevRange = prevWidth
        if (type === 'y') {
            prevPosition = prevY
            prevRange = prevHeight
        }

        if (typeof position === 'undefined' || position === 'after') {
            return prevPosition + prevRange + margin
        } else if (position === 'before') {
            return prevPosition - range - margin
        } else if (position === 'middle') {
            return ((prevPosition + prevRange) / 2) + margin
        } else if (position === 'same') {
            return prevPosition + margin
        } else {
            return prevPosition
        }
    }

    getCanvasSize() {


        const {renderQueue, padding} = this

        let endX = 0
        let endY = 0
        let startX = 0
        let startY = 0

        let width
        let height

        for (let i = 0; i < renderQueue.length; i++) {
            const item = renderQueue[i]
            const {x, y, width, height} = item
            const itemEndX = x + width
            const itemEndY = y + height
            endX = endX > itemEndX ? endX : itemEndX
            endY = endY > itemEndY ? endY : itemEndY
            startX = startX > x ? x : startX
            startY = startY > y ? y : startY
        }

        width = endX - startX + (padding * 2)
        height = endY - startY + (padding * 2)

        return {
            endX,
            endY,
            startX,
            startY,
            width,
            height
        }
    }

    image(option, callback) {
        const {
            src,
            width,
            height,
            x,
            y,
            marginX = 0,
            marginY = 0,
            target,
        } = option

        if (!src) {
            callback && callback()
            return
        }
        const image = new Image()
        image.src = src
        image.onload = () => {
            const imgWidth = image.width
            const imgHeight = image.height
            const graphWidth = typeof width === 'undefined' ? imgWidth : width
            const graphHeight = typeof height === 'undefined' ? imgHeight : height
            const positionX = this.getPosition('x', x, graphWidth, marginX, target)
            const positionY = this.getPosition('y', y, graphHeight, marginY, target)

            this.prevX = positionX
            this.prevY = positionY
            this.prevWidth = graphWidth
            this.prevHeight = graphHeight

            // ctx.drawImage(image, positionX, positionY, graphWidth, graphHeight)

            this.renderQueue.push({
                type: 'image',
                x: positionX,
                y: positionY,
                width: graphWidth,
                height: graphHeight,
                context: image
            })
            callback && callback()
        }
        image.onerror = () => {
            callback && callback()
        }

    }

    text(option, callback) {
        const {ctx, DEFAULT_FONT_STYLE} = this
        const {
            context,
            x,
            y,
            marginX = 0,
            marginY = 0,
            fontSize,
            fontFamily,
            fontColor,
            fontWeight,
            textBaseline,
            textAlign,
            target
        } = option

        if (!context) {
            callback && callback()
            return
        }

        const newFontSize = fontSize || DEFAULT_FONT_STYLE.fontSize
        const newFontColor = fontColor || DEFAULT_FONT_STYLE.color
        const newFontFamily = fontFamily || DEFAULT_FONT_STYLE.fontFamily
        const newFontWeight = fontWeight || DEFAULT_FONT_STYLE.fontWeight
        const newTextBaseline = textBaseline || DEFAULT_FONT_STYLE.baseline
        const newTextAlign = textAlign || DEFAULT_FONT_STYLE.textAlign
        const newFont = `${newFontSize}px ${newFontFamily} ${newFontWeight}`

        ctx.font = newFont

        const graphWidth = ctx.measureText(context).width
        const graphHeight = newFontSize
        const positionX = this.getPosition('x', x, graphWidth, marginX, target)
        const positionY = this.getPosition('y', y, graphHeight, marginY, target)

        let startX = positionX
        let startY = positionY

        // 文本对齐方式为 右
        if (newTextAlign === 'right') {
            startX = positionX - graphWidth
        } else if (newTextAlign === 'middle') {
            startX = positionX - (graphWidth / 2)
        }

        if (newTextBaseline === 'bottom') {
            startY = positionY - graphHeight
        } else if (newTextBaseline === 'middle') {
            startY = positionY + (graphHeight / 2)
        }

        this.prevX = startX
        this.prevY = startY

        this.prevWidth = graphWidth
        this.prevHeight = graphHeight


        this.renderQueue.push({
            type: 'text',
            x: startX,
            y: startY,
            width: graphWidth,
            height: graphHeight,
            font: newFont,
            fillStyle: newFontColor,
            context
        })
        callback && callback()
    }


    createGraph(callback) {
        const {templates} = this
        const len = templates.length
        let index = this.index
        if (index < len - 1) {
            this.index = index += 1
            const temp = templates[index]
            const {type = 'text'} = temp

            if (this[type]) {
                this[type](temp, () => {
                    this.getCanvasSize()
                    this.createGraph(callback)
                })
            } else {
                this.createGraph(callback)
            }
        } else {
            this.index = -1
            callback && callback()
        }
    }

    getPoint(point, type) {
        const {startX, startY, padding} = this
        if (type === 'x') {
            return startX > 0 ? point + padding : Math.abs(startX) + point + padding
        } else {
            return startY > 0 ? point + padding : Math.abs(startY) + point + padding
        }
    }

    render(callback) {

        this.createGraph(() => {
            const {renderQueue, ctx, canvas, dataType, quality} = this
            let renderData = []
            const {
                endX,
                endY,
                startX,
                startY,
                width,
                height
            } = this.getCanvasSize()

            this.endX = endX
            this.endY = endY
            this.startX = startX
            this.startY = startY
            this.width = width
            this.height = height

            canvas.width = width
            canvas.height = height


            while (renderQueue.length) {
                const item = renderQueue.shift()
                let {type, x, y} = item
                x = this.getPoint(x, 'x')
                y = this.getPoint(y, 'y')

                if (dataType === 'renderData') {
                    item.x = x
                    item.y = y
                    renderData.push(item)
                } else if (type === 'image') {
                    let {
                        width,
                        height,
                        context
                    } = item

                    ctx.drawImage(context, x, y, width, height)
                } else if (type === 'text') {
                    let {font, fillStyle, context} = item


                    ctx.textBaseline = 'top'
                    ctx.textAlign = 'left'
                    ctx.font = font
                    ctx.fillStyle = fillStyle
                    ctx.fillText(context, x, y)
                }

            }
            if (dataType === 'renderData') {
                callback && callback({
                    data: renderData,
                    width,
                    height
                })
            } else if (dataType === 'imageData') {
                const imageData = ctx.getImageData(0, 0, width, height)
                callback && callback(imageData)
            } else {
                const dataUrl = canvas.toDataURL(dataType, quality)
                callback && callback(dataUrl)
            }
        })
    }
}

/**
 * 图片添加水印
 * @param uri
 * @param drawOptions
 * @param callback
 */
export default function (uri, drawOptions, callback) {

    const defaultOptions = {
        position: 'left-top',
        type: 'image/jpg',
        dataType: 'blob',
        quality: 1
    }

    const defaultWatermark = {
        templates: [],
        padding: 10,
        quality: 1
    }


    let {position, type, dataType, quality, watermark} = drawOptions || {}

    position = position || defaultOptions.position
    type = type || defaultOptions.type
    dataType = dataType || defaultOptions.dataType
    quality = quality || defaultOptions.quality

    const watermarkOptions = {...defaultWatermark, ...watermark, dataType: 'renderData'}

    const random = (Math.random() * 1000).toFixed(0)
    const image = new Image()
    image.src = `${uri}?v=${random}`

    function getPosition(position, imageWidth, imageHeight, watermarkWidth, watermarkHeight) {

        const ratio = {
            'left': [0, 0],
            'left-top': [0, 0],
            'left-middle': [0, 1],
            'left-bottom': [0, 2],
            'middle': [1, 1],
            'middle-top': [1, 0],
            'middle-middle': [1, 1],
            'middle-bottom': [1, 2],
            'right': [0, 2],
            'right-top': [0, 2],
            'right-middle': [1, 2],
            'right-bottom': [2, 2]
        }

        const imageXMiddle = imageWidth / 2
        const imageYMiddle = imageHeight / 2
        const watermarkXMiddle = watermarkWidth / 2
        const watermarkYMiddle = watermarkHeight / 2

        const [deviationX, deviationY] = ratio[position] || ratio['left']

        const x = deviationX * imageXMiddle - deviationX * watermarkXMiddle
        const y = deviationY * imageYMiddle - deviationY * watermarkYMiddle

        return {x, y}

    }

    function render(renderData = [], offsetX, offsetY) {
        const ctx = this
        for (let i = 0; i < renderData.length; i++) {
            const item = renderData[i]
            let {
                x,
                y,
                type
            } = item

            x = x + offsetX
            y = y + offsetY

            if (type === 'image') {
                let {

                    width,
                    height,
                    context
                } = item

                ctx.drawImage(context, x, y, width, height)
            } else if (type === 'text') {
                let {
                    font,
                    fillStyle,
                    context
                } = item

                ctx.textBaseline = 'top'
                ctx.textAlign = 'left'
                ctx.font = font
                ctx.fillStyle = fillStyle
                ctx.fillText(context, x, y)
            }
        }
    }

    function getBlob(dataUrl, type) {
        const bin = atob(dataUrl)
        const buffer = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) {
            buffer[i] = bin.charCodeAt(i)
        }
        return new Blob([buffer.buffer], {type: type})
    }

    image.onload = function () {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext("2d")
        const imageWidth = image.width
        const imageHeight = image.height
        canvas.width = imageWidth
        canvas.height = imageHeight

        const watermarkObject = new CreateWatermark(watermarkOptions)
        watermarkObject.render(function (watermark) {
            const {width: watermarkWidth, height: watermarkHeight, data} = watermark
            const {x, y} = getPosition(position, imageWidth, imageHeight, watermarkWidth, watermarkHeight)
            ctx.drawImage(image, 0, 0, imageWidth, imageHeight)

            render.call(ctx, data, x, y)

            const canvasData = canvas.toDataURL(type, quality)

            if (dataType === 'blob') {
                callback(true, getBlob(canvasData.split(',')[1], type))

            } else {
                callback(true, canvasData)
            }
        })


    }

    image.onerror = function () {
        callback(false)
    }

}








