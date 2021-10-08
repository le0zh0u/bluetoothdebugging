const app = getApp()
const util = require('../../utils/util.js')
 
Page({
  data: {
    searchDeviceId: '00:19:10:09:3A:3B',
    devices: [],
    connected: false,
    chs: [],
    adapterAvailable: false,
    adapterDiscovering: false
  },
  onLoad(){
    // this.openBluetoothAdapter()
  },
  onShow(){
    this.openBluetoothAdapter()
  },
  onHide(){
    this.closeBluetoothAdapter()
  },
  onUnload() {
    this.closeBluetoothAdapter()
  },
  openBluetoothAdapter() {
    console.log('openBluetoothAdapter doing')
    var that = this;
    wx.openBluetoothAdapter({
      success: (res) => {
        console.log('openBluetoothAdapter success', res)
        that.setData({
          adapterAvailable: true
        })
      },
      fail: (res) => {
        console.log('openBluetoothAdapter fail', res)
        if (res.errCode === 10001) {
          wx.onBluetoothAdapterStateChange(function (res) {
            console.log('onBluetoothAdapterStateChange', res)
            that.setData({
              adapterAvailable: res.available,
              adapterDiscovering: res.discovering
            })
          })
          return ;
        }

        // handle for already opened. get state and set state
        wx.getBluetoothAdapterState({
          success: (res) => {
            console.log(res)
            if(res.adapterState){
              that.setData({
                adapterAvailable: res.adapterState.available,
                adapterDiscovering: res.adapterState.discovering
              })
            } else {
              failMsg('获取蓝牙状态失败')
            }
          },
          fail: (res) => {
            console.log(res)
            failMsg('获取蓝牙状态失败')
          }
        })
      }
    })
  },
  failMsg(msg) {
    wx.showToast({
      title: msg,
      icon: 'error',
      duration: 1000,
      mask:true
  })
  },
  successMsg(msg) {
    wx.showToast({
      title: msg,
      icon: 'success',
      duration: 1000,
      mask: true //是否有透明蒙层，默认为false
      })
  },
  getBluetoothAdapterState() {
    wx.getBluetoothAdapterState({
      success: (res) => {
        console.log('getBluetoothAdapterState', res)
        if (res.discovering) {
          this.onBluetoothDeviceFound()
        } else if (res.available) {
          this.startBluetoothDevicesDiscovery()
        }
      }
    })
  },
  toggleDiscovery() {
    if(this.data.adapterDiscovering){
      this.stopBluetoothDevicesDiscovery()
    } else  {
      this.startBluetoothDevicesDiscovery()
    }
  },
  startBluetoothDevicesDiscovery() {
    if (!this.data.adapterAvailable) {
      this.failMsg('当前蓝牙不可用')
      return
    }
    if(this.data.adapterDiscovering){
      this.failMsg('当前蓝牙扫描中，请不要重复操作')
      return
    }

    // clear data before discovery
    this.clearDeviceData()

    wx.showLoading({
      title: '准备开始扫描',
    })
    wx.startBluetoothDevicesDiscovery({
      allowDuplicatesKey: true,
      powerLevel: 'high',
      success: (res) => {
        console.debug('startBluetoothDevicesDiscovery success', res)
        this.setData({
          adapterDiscovering: true
        })
        this.successMsg('正在扫描设备')
        this.onBluetoothDeviceFound()
      },
      fail: (res) => {
        console.debug('startBluetoothDevicesDiscovery fail', res)
        this.setData({
          adapterDiscovering: false
        })
        this.failMsg(res.errMsg)
      },
      complete: () => {
        wx.hideLoading()
      }
    })
  },
  stopBluetoothDevicesDiscovery() {
    let current = this.data.adapterDiscovering
    if(current){
      wx.showLoading({
        title: '准备停止扫描',
      })
      wx.stopBluetoothDevicesDiscovery({
        success: (res) => {
          this.setData({
            adapterDiscovering: false
          })
          this.successMsg('停止扫描设备')
        }, 
        fail: (res) => {
          console.log(res)
          this.setData({
            adapterDiscovering: current
          })
          this.failMsg(res.errMsg)
        },
        complete: () => {
          wx.hideLoading()
        }
      })
    }
  },
  onBluetoothDeviceFound() {
    wx.onBluetoothDeviceFound((res) => {
      res.devices.forEach(device => {
        if(device.deviceId === this.data.searchDeviceId){
          console.log("FOUND")
        }
        if (!device.name && !device.localName) {
          return
        }
        console.log(device)
        const foundDevices = this.data.devices
        const idx = util.inArray(foundDevices, 'deviceId', device.deviceId)
        const data = {}
        if (idx === -1) {
          data[`devices[${foundDevices.length}]`] = device
        } else {
          data[`devices[${idx}]`] = device
        }
        this.setData(data)
      })
    })
  },
  clearDeviceData(){
    //1. close discovery 
    this.stopBluetoothDevicesDiscovery()
    //2. clear device data
    this.setData({
      devices: [],
      connected: false,
      chs: [],
      adapterDiscovering: false,
    })
  },
  /**
   * 选择一个设备
   * @param {params} e 
   */
  tapDevice(e){
    // stop devices discovery
    this.stopBluetoothDevicesDiscovery()

    // redirect to new page
    const ds = e.currentTarget.dataset
    const deviceId = ds.deviceId
    const name = ds.name
    wx.navigateTo({
      url: '/pages/device/device?deviceId='+deviceId+'&name='+name
    })
  },
  closeBluetoothAdapter() {
    wx.closeBluetoothAdapter()
    this.setData({
      adapterDiscovering: false
    })
  },
})