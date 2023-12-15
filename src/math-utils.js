export default class MathUtils {
    static clamp(v, min=0, max=1){
        return Math.min(max, Math.max(min, v))
    }
    static lerp(a, b, t){
        t = this.clamp(t)
        return (1-t) * a + t * b
    }
    static randomRange(min, max){
        return this.lerp(min, max, Math.random())
    }
}