class Device {
  constructor() {
    this.ua = navigator.userAgent
  }
  get isIphone(){
    return /iPhone/gi.test(this.ua)
  }
  get isAndroid(){
    return /Android/gi.test(this.ua)
  }
  get isWechat(){
    return /micromessenger/gi.test(this.ua)
  }
  get isApp(){
    const query = parseQuery(location.search)
    if(query.deviceType){
      return true
    }
    return false
  }
}

export const device = new Device()
export default {}