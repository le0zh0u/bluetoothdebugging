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
    characteristicUUIDs: null,
    serviceUUIDs: null,
    isFirtLoading: true,
    servicePosition: 0
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
        that.setData({
          connected: false
        })
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
      } else {
        console.log(this.data)
        if(!this.data.serviceUUIDs){
          this.getBLEDeviceServices(this.data.deviceId, false)
        } else if(!this.data.characteristicUUIDs){
          this.fetchBLEDeviceCharacteristics(this.data.deviceId, this.data.serviceUUIDs[this.data.servicePosition].uuid, this.data.servicePosition)
        }
      }
    }

    this.setData({
      isFirtLoading: false
    })
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
   * ************蓝牙相关 *****************
   */
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
    let that = this
    wx.createBLEConnection({
      deviceId,
      success: (res) => {
        wx.hideLoading()
        this.setData({
          connected: true,
          name,
          deviceId,
        })
        this.getBLEDeviceServices(deviceId, true)
        wx.showToast({
          title: '设备连接成功',
          icon: 'success',
          duration: 1000,
          mask: true //是否有透明蒙层，默认为false
        })
      },
      fail: (res) => {
        console.log(res)
        setTimeout(() => {
          wx.hideLoading({
            complete: (res) => {
              that.setData({
                servicePosition: 0
              })
              that.showFail('设备连接失败', true)
            },
          })
        }, 400);
      }
    })
  },

  /**
   * 获取设备服务
   * @param {} deviceId 
   */
  getBLEDeviceServices(deviceId, directNavigate = false) {
    let that = this
    wx.getBLEDeviceServices({
      deviceId,
      success: (res) => {
        // console.log(res.services)
        let serviceUUIDs = new Array()
        var PromiseAllArr  = [];
        for (let i = 0; i < res.services.length; i++) {
          if (res.services[i].isPrimary) {
            if(directNavigate){
              PromiseAllArr.push(that.fetchBLEDeviceCharacteristicsPromise(deviceId, res.services[i]))
            }

            serviceUUIDs.push(res.services[i])
            // this.getBLEDeviceCharacteristics(deviceId, res.services[i].uuid)
            // return
          }
        }
        // check for auto connect
        if(directNavigate){
          Promise.all(PromiseAllArr).then(function(values){
            values.forEach(service => {
              console.log(service)
              const chs = service.chs
              const serviceUUId = service.ser
              if(chs){
                if(chs.length === 1){
                  const props = chs[0].properties
                  if(props && props.write && props.read && (props.notify || props.indicate)){
                    that.navigateToSend(deviceId, serviceUUId, chs[0], that.data.name)
                  }
                }
              }
            });
          })
        }
        
        that.setData({
          serviceUUIDs: serviceUUIDs
        })
        
        // get characteristics
        that.fetchBLEDeviceCharacteristics(deviceId, serviceUUIDs[that.data.servicePosition].uuid, that.data.servicePosition)
      },
      fail: (res) => {
        // console.log('getBLEDeviceServices fail', res)
        wx.hideLoading({
          success: (res) => {
            that.setData({
              servicePosition: 0
            })
            that.showFail('连接失败')
          },
        })
        
      }
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
          // console.log('closeBLEConnection success', res)
          wx.showToast({
            title: that.data.name + '已断开',
            icon: 'none',
            duration: 1000
          })
        },
        fail: (res) => {
          // console.log('closeBLEConnection fail', res)
          that.showFail('关闭蓝牙连接失败', false)
        }
      })
    }

    this.setData({
      characteristicUUIDs: null,
      serviceUUIDs: null,
      connected: false,
    })
  },

  /**
   * 异步方式获取特征值
   */
  fetchBLEDeviceCharacteristicsPromise(deviceId, serviceUUID){
    const uuid = serviceUUID.uuid
    return new Promise((resolve, reject) => {
      wx.getBLEDeviceCharacteristics({
        deviceId: deviceId,
        serviceId: uuid,
        success(data) {
          // console.log(`fetchBLEDeviceCharacteristics success, ${uuid}`, data)
          let characteristicUUIDs = new Array()
          for (let i = 0; i < data.characteristics.length; i++) {
            const item = data.characteristics[i];
            characteristicUUIDs.push(item);
          }

          const service = {}
          service.id = uuid
          service.ser = serviceUUID
          service['chs'] = characteristicUUIDs
          resolve(service)
        },
        fail(res) {
          // console.log(`fetchBLEDeviceCharacteristics fail, ${uuid}`, res)
          reject({
            id: uuid,
            ser: serviceUUID
          })
        }
      })
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
        // console.log('fetchBLEDeviceCharacteristics success', data)
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
        // console.log('fetchBLEDeviceCharacteristics fail', res)
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
   * ************* 按钮事件 *****************
   */
  /**
   * 点击重新加载
   * @param {event}} res 
   */
  tapReload(res) {
    this.onReady()
  },


  /**
   * 点击serviceUUID，获取服务下的所有特征
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

  /**
   * 点击CharacteristicUUID，进入发送内容页面
   * @param {*} e 
   */
  tapCharacteristicUUID(e) {
    let that = this
    let index = e.target.dataset.index
    let characteristicsUUID = that.data.characteristicUUIDs[index]
    let deviceId = that.data.deviceId
    let serviceUUID = that.data.serviceUUIDs[that.data.servicePosition]
    that.navigateToSend(deviceId, serviceUUID, characteristicsUUID, that.data.name)
  },

  /**
   * 跳转到发送消息页面
   * @param {*} deviceId 
   * @param {*} serviceUUID 
   * @param {*} characteristicsUUID 
   * @param {*} deviceName 
   */
  navigateToSend(deviceId, serviceUUID, characteristicsUUID, deviceName){
    let obj = {
      characteristicsUUID: characteristicsUUID,
      deviceId: deviceId,
      serviceUUID: serviceUUID,
      deviceName: deviceName,
      needClose: false
    }

    var data = JSON.stringify(obj);
    wx.navigateTo({
      url: '/pages/send/send?data=' + data,
    })
  },

  /**
   * ****************** 通用能力 **************
   */
  /**
   * 展示失败文案
   * @param {*} text 
   * @param {*} mask 
   */
  showFail(text, mask = false) {
    wx.showToast({
      title: text,
      icon: 'error',
      duration: 1000,
      mask: mask
    })
  },
  
})