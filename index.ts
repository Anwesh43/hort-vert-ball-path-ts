const w : number = window.innerWidth 
const h : number = window.innerHeight
const parts : number = 3  
const scGap : number = 0.02 / parts 
const strokeFactor : number = 90 
const rFactor : number = 12.2
const colors : Array<string> = [
    "#F44336",
    "#03A9F4",
    "#009688",
    "#3F51B5",
    "#4CAF50"
]
const delay : number = 20 
const backColor : string = "#BDBDBD"

class ScaleUtil {

    static maxScale(scale : number, i : number, n : number) : number {
        return Math.max(0, scale - i / n)
    }
    static divideScale(scale : number, i : number, n : number) : number {
        return Math.min(1 / n, ScaleUtil.maxScale(scale, i, n)) * n 
    }

    static sinify(scale : number) : number {
        return Math.sin(scale * Math.PI)
    }
}

class DrawingUtil {

    static drawCircle(context : CanvasRenderingContext2D, x : number, y : number, r : number) {
        context.beginPath()
        context.arc(x, y, r, 0, 2 * Math.PI)
        context.fill()
    }

    static drawLine(context : CanvasRenderingContext2D, x1 : number, y1 : number, x2 : number, y2 : number) {
        context.beginPath()
        context.moveTo(x1, y1)
        context.lineTo(x2, y2)
        context.stroke()
    }

    static drawVertLinePath(context : CanvasRenderingContext2D, x : number, gap : number, ystart : number, yend : number, ) {
        for (var j = 0; j < 2; j++) {
            context.save()
            context.translate(x + 2 * gap * j, ystart)
            DrawingUtil.drawLine(context, 0, 0, 0, yend);
            context.restore()
        }
    }

    static drawHorizontalPath(context : CanvasRenderingContext2D, y : number, gap : number, xstart : number, xend : number) {
        for (var j = 0; j < 2; j++) {
            context.save()
            context.translate(xstart, y + 2 * gap * j)
            DrawingUtil.drawLine(context, 0, 0, xend, 0)
            context.restore()
        }
    } 

    static drawHortVertBallPath(context : CanvasRenderingContext2D, scale : number) {
        const offset : number = context.lineWidth
        const sf : number = ScaleUtil.sinify(scale)
        const sf1 : number = ScaleUtil.divideScale(sf, 0, parts)
        const sf2 : number = ScaleUtil.divideScale(sf, 1, parts)
        const sf3 : number = ScaleUtil.divideScale(sf, 2, parts)
        const r : number = Math.min(w, h) / rFactor 
        const xStart : number = offset 
        const xDist : number = w - 2 * offset 
        const yStart : number = h - offset 
        const yDist : number = h - 2 * offset 
        DrawingUtil.drawHorizontalPath(context,h - offset - 2 * r, r, xStart, xDist * sf1)
        DrawingUtil.drawVertLinePath(context, offset, r,  yStart, -yDist * sf1)       
        DrawingUtil.drawCircle(context, xStart + r + (xDist - 2 * r) * sf3, yStart - r, r * sf2)
        DrawingUtil.drawCircle(context, offset + r, yStart - r - (yDist - 2 * r) * sf3, r * sf2)
    } 

    static drawHVBPNode(context : CanvasRenderingContext2D, i : number, scale : number) {
        context.lineCap = 'round'
        context.lineWidth = Math.min(w, h) / strokeFactor
        context.strokeStyle = colors[i]
        context.fillStyle = colors[i]
        DrawingUtil.drawHortVertBallPath(context, scale)
    }
}

class Stage {

    canvas : HTMLCanvasElement = document.createElement('canvas')
    context : CanvasRenderingContext2D 
    renderer : Renderer = new Renderer()

    initCanvas() {
        this.canvas.width = w 
        this.canvas.height = h 
        this.context = this.canvas.getContext('2d')
        document.body.appendChild(this.canvas)
    }

    render() {
        this.context.fillStyle = backColor 
        this.context.fillRect(0, 0, w, h)
        this.renderer.render(this.context)
    }

    handleTap() {
        this.canvas.onmousedown = () => {
            this.renderer.handleTap(() => {
                this.render()
            })
        }
    }

    static init() {
        const stage : Stage = new Stage()
        stage.initCanvas()
        stage.render()
        stage.handleTap()
    }

}

class State {

    scale : number = 0 
    dir : number = 0 
    prevScale : number = 0 

    update(cb : Function) {
        this.scale += scGap * this.dir 
        if (Math.abs(this.scale - this.prevScale) > 1) {
            this.scale = this.prevScale + this.dir 
            this.dir = 0 
            this.prevScale = this.scale 
            cb()
        }
    }

    startUpdating(cb : Function) {
        if (this.dir == 0) {
            this.dir = 1 - 2 * this.prevScale 
            cb()
        }
    }
}

class Animator {

    animated : boolean = false 
    interval : number 

    start(cb : Function) {
        if (!this.animated) {
            this.animated = true 
            this.interval = setInterval(cb, delay)
        }
    }

    stop() {
        if (this.animated) {
            this.animated = false 
            clearInterval(this.interval)
        }
    }
}

class HVBNode {

    next : HVBNode 
    prev : HVBNode 
    state : State = new State()

    constructor(private i : number) {
        this.addNeighbor()
    }

    addNeighbor() {
        if (this.i < colors.length - 1) {
            this.next = new HVBNode(this.i + 1)
            this.next.prev = this 
        }
    }

    draw(context : CanvasRenderingContext2D) {
        DrawingUtil.drawHVBPNode(context, this.i, this.state.scale)
    }

    update(cb : Function) {
        this.state.update(cb)
    }

    startUpdating(cb : Function) {
        this.state.startUpdating(cb)
    }

    getNext(dir : number, cb : Function) : HVBNode {
        var curr : HVBNode = this.prev 
        if (dir == 1) {
            curr = this.next 
        }
        if (curr) {
            return curr 
        }
        cb()
        return this 
    }
}

class HortVertBallPath {

    curr : HVBNode = new HVBNode(0)
    dir : number = 1

    draw(context : CanvasRenderingContext2D) {
        this.curr.draw(context)
    }

    update(cb : Function) {
        this.curr.update(() => {
            this.curr = this.curr.getNext(this.dir, () => {
                this.dir *= -1
            })
            cb()
        })
    }

    startUpdating(cb : Function) {
        this.curr.startUpdating(cb)
    }
}

class Renderer {

    hvb : HortVertBallPath = new HortVertBallPath()
    animator : Animator = new Animator()

    render(context : CanvasRenderingContext2D) {
        this.hvb.draw(context)
    }

    handleTap(cb : Function) {
        this.hvb.startUpdating(() => {
            this.animator.start(() => {
                cb()
                this.hvb.update(() => {
                    this.animator.stop()
                    cb()
                })
            })
        })
    }
}