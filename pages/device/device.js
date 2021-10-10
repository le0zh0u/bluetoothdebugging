// pages/device/device.js
const util = require('../../utils/util.js')

Page({

  /**
   * 页面的初始数据
   */
  data: {
    deviceId: '',
    name: '',
    sendData: '',
    connected: false,
    chs: [],
    canWrite: false,
    characteristicUUIDs: null,
    serviceUUIDs: null,
    isFirtLoading: true,
    servicePosition: 0,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    this.setData({
      deviceId: options.deviceId,
      name: options.name
    })
    wx.setNavigationBarTitle({
      title: options.name,
    })

    let that = this
    wx.onBLEConnectionStateChange((res) => {
      console.log(`device ${res.deviceId} state has changed, connected: ${res.connected}`)
      if (!res.connected && res.deviceId == that.data.deviceId) {
        console.log('设备连接已经断开')
        that.closeBLEConnection(that.data.deviceId)
      }
    })
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady: function () {
    this.createBLEConnection()
  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {
    if (!this.data.isFirtLoading) {
      if (!this.data.connected) {
        this.setData({
          characteristicUUIDs: null,
          serviceUUIDs: null
        })
      }
    }

    this.setData({
      isFirtLoading: false
    })
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    // if(this.data.connected){
    //   this.closeBLEConnection()
    // }
    // this.closeBluetoothAdapter()
  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload: function () {
    wx.offBLEConnectionStateChange()
    if (this.data.connected) {
      this.closeBLEConnection()
    }
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
          return;
        }

        // handle for already opened. get state and set state
        wx.getBluetoothAdapterState({
          success: (res) => {
            console.log(res)
            if (res.adapterState) {
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
  reload(res) {
    this.onReady()
  },
  /**
   * 创建蓝牙连接
   */
  createBLEConnection() {
    const deviceId = this.data.deviceId
    const name = this.data.name
    wx.showLoading({
      title: '连接中',
      mask: true
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
        that.setData({
          servicePosition: 0
        })
        wx.showToast({
          title: '设备连接失败',
          icon: 'error',
          duration: 1000,
          mask: true, //是否有透明蒙层，默认为false
        })

      }
    })
  },
  showFail(text) {
    wx.showToast({
      title: text,
      icon: 'none',
      duration: 1000
    })
  },
  /**
   * 关闭蓝牙连接
   */
  closeBLEConnection() {
    let that = this
    if (this.data.deviceId) {
      wx.closeBLEConnection({
        deviceId: this.data.deviceId,
        success: (res) => {
          console.log('closeBLEConnection success', res)
          wx.showToast({
            title: that.data.name + '已断开',
            icon: 'none',
            duration: 1000
          })
        },
        fail: (res) => {
          console.log('closeBLEConnection fail', res)
        }
      })
    }

    this.setData({
      characteristicUUIDs: null,
      serviceUUIDs: null,
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
    let that = this
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        // console.log(res.services)
        let serviceUUIDs = new Array()
        for (let i = 0; i < res.services.length; i++) {
          if (res.services[i].isPrimary) {
            serviceUUIDs.push(res.services[i])
            // this.getBLEDeviceCharacteristics(deviceId, res.services[i].uuid)
            // return
          }
        }
        that.setData({
          serviceUUIDs: serviceUUIDs
        })

        // get characteristics
        that.fetchBLEDeviceCharacteristics(deviceId, serviceUUIDs[that.data.servicePosition].uuid, that.data.servicePosition)
      },
      fail: (res) => {
        console.log('getBLEDeviceServices fail', res)
        wx.hideLoading()
        that.setData({
          servicePosition: 0
        })
        wx.showToast({
          title: '连接失败',
        })
      }
    })
  },

  /**
   * 点击serviceUUID
   * @param {event} e 
   */
  tapServiceUUID(e) {
    let index = e.currentTarget.dataset.index
    if (index != this.data.servicePosition) {
      let servicePosition = this.data.servicePosition
      this.setData({
        servicePosition: index
      })

      this.fetchBLEDeviceCharacteristics(this.data.deviceId, this.data.serviceUUIDs[index].uuid, servicePosition)
    }
  },

  tapCharacteristicUUID(e) {
    let that = this
    let index = e.target.dataset.index
    let characteristicsUUID = that.data.characteristicUUIDs[index]
    let deviceId = that.data.deviceId
    let serviceUUID = that.data.serviceUUIDs[that.data.servicePosition]
    let obj = {
      characteristicsUUID: characteristicsUUID,
      deviceId: deviceId,
      serviceUUID: serviceUUID,
      deviceName: that.data.name,
      needClose: false
    }

    var data = JSON.stringify(obj);
    wx.navigateTo({
      url: '/pages/send/send?data=' + data,
    })
  },

  /**
   * 拉取特征值
   * @param {*} deviceId 
   * @param {*} uuid 
   * @param {*} lastPosition 
   */
  fetchBLEDeviceCharacteristics(deviceId, uuid, lastPosition) {

    wx.showLoading({
      title: '特征值加载中',
      mask: true,
    })

    let that = this
    wx.getBLEDeviceCharacteristics({
      deviceId: deviceId,
      serviceId: uuid,
      success(data) {
        console.log('fetchBLEDeviceCharacteristics success', data)
        setTimeout(() => {
          wx.hideLoading({
            complete: (res) => {
              let characteristicUUIDs = new Array()
              for (let i = 0; i < data.characteristics.length; i++) {
                const item = data.characteristics[i];
                characteristicUUIDs.push(item);
              }

              that.setData({
                characteristicUUIDs: characteristicUUIDs
              })
            },
          })
        }, 400);

      },
      fail(res) {
        console.log('fetchBLEDeviceCharacteristics fail', res)
        setTimeout(() => {
          wx.hideLoading({
            success: (res) => {
              that.setData({
                servicePosition: lastPosition
              })
              that.showFail('连接失败')
              that.closeBLEConnection()
            },
          })
        }, 400);

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
              success(res) {
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
          value: util.ab2hex(characteristic.value)
        }
      } else {
        data[`chs[${idx}]`] = {
          uuid: characteristic.characteristicId,
          value: util.ab2hex(characteristic.value)
        }
      }
      // data[`chs[${this.data.chs.length}]`] = {
      //   uuid: characteristic.characteristicId,
      //   value: util.ab2hex(characteristic.value)
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
      complete: res => {
        this.setData({
          shuju: res
        })
      }
    })
  },
})