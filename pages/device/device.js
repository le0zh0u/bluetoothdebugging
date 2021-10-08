// pages/device/device.js
const util = require('../../utils/util.js')

Page({

  /**
   * 页面的初始数据
   */
  data: {
    deviceId: '',
    name: '',
    adapterAvailable: false,
    sendData: '',
    connected: false,
    chs: [],
    canWrite: false,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      deviceId: options.deviceId,
      name : options.name
    })
    wx.setNavigationBarTitle({
      title: options.name,
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    this.openBluetoothAdapter()
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    if(this.data.connected){
      this.closeBLEConnection()
    }
    this.closeBluetoothAdapter()
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    if(this.data.connected){
      this.closeBLEConnection()
    }
    this.closeBluetoothAdapter()
  },


  /**
   * custom methods
   */
   /**
    * 打开蓝牙适配器
    */
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
  /**
   * 关闭蓝牙适配器
   */
  closeBluetoothAdapter() {
    wx.closeBluetoothAdapter()
    this.setData({
      adapterAvailable: false
    })
  },
  /**
   * 创建蓝牙连接
   */
  createBLEConnection() {
    const deviceId = this.data.deviceId
    const name = this.data.name
    wx.showLoading({
      title: '连接中',
    })
    wx.createBLEConnection({
      deviceId,
      success: (res) => {
        wx.hideLoading()
        this.setData({
          connected: true,
          name,
          deviceId,
        })
        this.getBLEDeviceServices(deviceId)
        wx.showToast({
          title: '设备连接成功',
          icon: 'success',
          duration: 1000,
          mask: true //是否有透明蒙层，默认为false
          })
      },
      fail: (res) => {
        console.log(res)
        wx.hideLoading()
        wx.showToast({
          title: '设备连接失败',
          icon: 'error',
          duration: 1000,
          mask: true //是否有透明蒙层，默认为false
          })
      }
    })
  },
  /**
   * 关闭蓝牙连接
   */
  closeBLEConnection() {
    if(this.data.deviceId){
      wx.closeBLEConnection({
        deviceId: this.data.deviceId
      })  
    }
    
    this.setData({
      connected: false,
      chs: [],
      canWrite: false,
    })
  },
  /**
   * 获取设备服务
   * @param {} deviceId 
   */
  getBLEDeviceServices(deviceId) {
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        console.log(res.services)
        for (let i = 0; i < res.services.length; i++) {
          if (res.services[i].isPrimary) {
            this.getBLEDeviceCharacteristics(deviceId, res.services[i].uuid)
            return
          }
        }
      }
    })
  },
  /**
   * 获取设备服务中所有特征
   * @param {*} deviceId 
   * @param {*} serviceId 
   */
  getBLEDeviceCharacteristics(deviceId, serviceId) {
    wx.getBLEDeviceCharacteristics({
      deviceId,
      serviceId,
      success: (res) => {
        console.log('getBLEDeviceCharacteristics success', res.characteristics)
        for (let i = 0; i < res.characteristics.length; i++) {
          let item = res.characteristics[i]
          if (item.properties.read) {
            wx.readBLECharacteristicValue({
              deviceId,
              serviceId,
              characteristicId: item.uuid,
            })
          }
          if (item.properties.write) {
            this.setData({
              canWrite: true
            })
            this._deviceId = deviceId
            this._serviceId = serviceId
            this._characteristicId = item.uuid
            // this.writeBLECharacteristicValue()
          }
          if (item.properties.notify || item.properties.indicate) {
            console.log('notify')
            wx.notifyBLECharacteristicValueChange({
              deviceId,
              serviceId,
              characteristicId: item.uuid,
              state: true,
              success (res) {
                console.log('notifyBLECharacteristicValueChange success', res.errMsg)
              }
            })
          }
        }
      },
      fail(res) {
        console.error('getBLEDeviceCharacteristics', res)
      }
    })
    // 操作之前先监听，保证第一时间获取数据
    wx.onBLECharacteristicValueChange((characteristic) => {
      console.log('onBLECharacteristicValueChange')
      console.log(characteristic)
      const idx = util.inArray(this.data.chs, 'uuid', characteristic.characteristicId)
      const data = {}
      if (idx === -1) {
        data[`chs[${this.data.chs.length}]`] = {
          uuid: characteristic.characteristicId,
          value: ab2hex(characteristic.value)
        }
      } else {
        data[`chs[${idx}]`] = {
          uuid: characteristic.characteristicId,
          value: ab2hex(characteristic.value)
        }
      }
      // data[`chs[${this.data.chs.length}]`] = {
      //   uuid: characteristic.characteristicId,
      //   value: ab2hex(characteristic.value)
      // }
      this.setData(data)
    })
  },
  writeBLECharacteristicValue() {
    // 向蓝牙设备发送一个0x00的16进制数据
    // let buffer = new ArrayBuffer(1)     
 
    let data = {
      latitude: "22.761592",
      longitude: "112.978089"
    }
    var buffer = stringToBytes("23.13265,112.978089")
 
    console.log("发送数据：", buffer) 
 
    let dataView = new DataView(buffer)
    dataView.setUint8(0, Math.random() * 255 | 0)
 
    console.log("发送服务码：" + this._characteristicId)
 
    wx.writeBLECharacteristicValue({
      deviceId: this._deviceId,
      serviceId: this._serviceId,
      characteristicId: this._characteristicId,
      value: buffer,
      complete:res=>{
        this.setData({
          shuju:res
        })
      }
    })
  },
})

// ArrayBuffer转16进度字符串示例
function ab2hex(buffer) {
  var hexArr = Array.prototype.map.call(
    new Uint8Array(buffer),
    function (bit) {
      return ('00' + bit.toString(16)).slice(-2)
    }
  )
  return hexArr.join('');
}

// 字符串转byte
function stringToBytes(str) {
  var array = new Uint8Array(str.length);
  for (var i = 0, l = str.length; i < l; i++) {
    array[i] = str.charCodeAt(i);
  }
  console.log(array);
  return array.buffer;
}