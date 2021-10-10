// pages/send/send.js
const util = require('../../utils/util.js')

const app = getApp()
Page({

  /**
   * 页面的初始数据
   */
  data: {
    receivedData: '',
    isHexShow: true, // 16进制显示
    sendLineBreak: false,
    sendHex: true,
    sendMsg: '111111111111',
    disabled: false,
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad: function (options) {
    let d = JSON.parse(options.data)
    let properties = d.characteristicsUUID.properties
    console.log(d)
    this.setData({
      data: d,
      disabled: !properties.write
    })
    // console.log(this.data.data)
    let that = this
    wx.setNavigationBarTitle({
      title: that.data.data.deviceName,
    })

    wx.onBLEConnectionStateChange(function (res) {
      // 该方法回调中可以用于处理连接意外断开等异常情况
      console.log(`device ${res.deviceId} state has changed, connected: ${res.connected}`)
      if (!res.connected && res.deviceId == that.data.data.deviceId) {
        console.log('连接已断开')
        that.closeBLEConnection(that.data.data.deviceId)
        app.globalData.isConnect = false
        wx.showModal({
          title: '提示',
          content: '连接已断开',
          showCancel: false,
          success(res) {
            if (res.confirm) {
              console.log('用户点击确定')

              let pages = getCurrentPages() // 获取当前页js里pages所有信息
              let prevPage = pages[pages.length - 2] // 获取上一个页面pages信息

              prevPage.setData({ // 直接更改上个页面数据
                connected: false
              })

              wx.navigateBack({
                delta: 1
              })
            }
          }
        })

      }
    })

  },


  /**
   * 生命周期函数--监听页面显示
   */
  onShow: function () {

    let that = this
    let deviceId = that.data.data.deviceId
    let serviceId = that.data.data.serviceUUID.uuid
    let characteristicId = that.data.data.characteristicsUUID.uuid
    // 必须在这里的回调才能获取
    wx.onBLECharacteristicValueChange(function (res) {
      console.log('characteristic value comed:', characteristicId)
      var currentData = '[' + util.formatTime(new Date()) + '] 接收 - '

      let hexStr = util.ab2hex(res.value)
      console.log('hex', hexStr)
      console.log('str', util.hexCharCodeToStr(hexStr))
      if (!that.data.isHexShow) {
        hexStr = util.hexCharCodeToStr(hexStr)
      }
      currentData += hexStr
      currentData += '\n'

      that.setData({
        receivedData: that.data.receivedData + currentData
      })
    })

    let properties = that.data.data.characteristicsUUID.properties

    if (properties.indicate || properties.notify) {

      wx.notifyBLECharacteristicValueChange({
        state: true, // 启用 notify 功能
        // 这里的 deviceId 需要已经通过 createBLEConnection 与对应设备建立链接
        deviceId,
        // 这里的 serviceId 需要在 getBLEDeviceServices 接口中获取
        serviceId,
        // 这里的 characteristicId 需要在 getBLEDeviceCharacteristics 接口中获取
        characteristicId,
        success(res) {
          console.log('notifyBLECharacteristicValueChange success', res.errMsg)
        },
        fail(res) {
          console.log('notifyBLECharacteristicValueChange fail', res)
          wx.showToast({
            title: '监听特征值变化失败',
            icon: 'error',
            duration: 2000
          })
        }
      })
    }
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide: function () {
    wx.offBLECharacteristicValueChange() // 取消监听低功耗蓝牙设备的特征值变化事件
    wx.offBLECharacteristicValueChange() // 取消监听低功耗蓝牙设备的特征值变化事件
  },
  onUnload() {
    if (this.data.data.needClose) {
      this.closeBLEConnection(this.data.data.deviceId)

    }
  },

  /**
   * 发送部分
   */
  /**
   * 文本框输入
   * @param {*} res 
   */
  bindSendMsgInput(res) {
    // console.log(res)
    let value = res.detail.value
    this.setData({
      sendMsg: value
    })

  },
  /**
   * send菜单变化
   * @param {*} res 
   */
  sendMenuChange(res) {
    // console.log(res)
    const values = res.detail.value
    let isHex = false
    let lineBreak = false
    for (let i = 0; i < values.length; i++) {
      if (values[i] == 'lineBreak') {
        lineBreak = true
      }
      if (values[i] == 'isHexShow') {
        isHex = true
      }
    }
    this.setData({
      sendLineBreak: lineBreak, // 换行
      sendHex: isHex // 16进制显示
    })
    // console.log(this.data.sendHex)
    // console.log(this.data.sendLineBreak)

  },

  /**
   * 发送 消息
   * @param {*} res 
   */
  tapSend(res) {
    let that = this
    let deviceId = that.data.data.deviceId
    let serviceId = that.data.data.serviceUUID.uuid
    let characteristicId = that.data.data.characteristicsUUID.uuid

    let senddata = that.data.sendMsg

    if (that.data.sendHex) {
      // HEX格式
      // senddata = util.strToHexCharCode(senddata)
      senddata = senddata.toLocaleUpperCase()
      console.log('senddata', senddata)

      try {
        var typedArray = new Uint8Array(senddata.match(/[\da-f]{2}/gi).map(function (h) {
          return parseInt(h, 16)
        }))
        that.send(deviceId, serviceId, characteristicId, typedArray.buffer)
      } catch (error) {
        wx.showToast({
          title: '请输入16进制字符串:EE',
          icon: 'error',
          duration: 1000
        })
      }
    } else {

      // 非HEX格式
      if (that.data.sendLineBreak) {
        senddata += '\r\n'
      }

      let buffer = new ArrayBuffer(senddata.length)
      let dataView = new DataView(buffer)
      for (var i = 0; i < senddata.length; i++) {
        dataView.setUint8(i, senddata.charAt(i).charCodeAt())
      }

      that.send(deviceId, serviceId, characteristicId, buffer)
    }

  },

  /**
   * 清除发送内容
   * @param {*} e 
   */
  tapClearSendMsg(e) {
    this.setData({
      sendMsg: ''
    })
  },

  /**
   * 接收部分
   */
  /**
   * 接受信息菜单变化
   * @param {*} res 
   */
  receivedMenuChange(res) {
    // console.log(res)
    const values = res.detail.value
    let isHex = false
    for (let i = 0; i < values.length; i++) {
      if (values[i] == 'isHexShow') {
        isHex = true
      }
    }
    this.setData({
      isHexShow: isHex // 16进制显示
    })
    // console.log(this.data.lineBreak)
    // console.log(this.data.isHexShow)
  },

  /**
   * 清除接收的消息
   * @param {event} res 
   */
  clearReceived(res) {
    this.setData({
      receivedData: ''
    })
  },

  /**
   * 蓝牙相关
   */
  /**
   * 发送消息
   * @param {*} deviceId 
   * @param {*} serviceId 
   * @param {*} characteristicId 
   * @param {*} buffer 
   */
  send(deviceId, serviceId, characteristicId, buffer) {
    wx.writeBLECharacteristicValue({
      // 这里的 deviceId 需要在 getBluetoothDevices 或 onBluetoothDeviceFound 接口中获取
      deviceId,
      // 这里的 serviceId 需要在 getBLEDeviceServices 接口中获取
      serviceId,
      // 这里的 characteristicId 需要在 getBLEDeviceCharacteristics 接口中获取
      characteristicId,
      // 这里的value是ArrayBuffer类型
      value: buffer,
      success(res) {
        // console.log('writeBLECharacteristicValue success', res.errMsg)
        wx.showToast({
          title: '已发送',
          icon: 'success',
          duration: 1000
        })
      },
      fail(res) {
        // console.log('writeBLECharacteristicValue fail', res)
        wx.showToast({
          title: '发送失败',
          icon: 'error',
          duration: 1000
        })
      }
    })
  },

  /**
   * 关闭连接
   * @param {*} deviceId 
   */
  closeBLEConnection(deviceId) {
    wx.closeBLEConnection({
      deviceId,
      success(res) {
        console.log('closeBLEConnection success', res)
        wx.showToast({
          title: 'ble已断开',
          icon: 'none',
          duration: 1000
        })
      },
      fail(res) {
        console.log('closeBLEConnection fail', res)
      }
    })
  },
})