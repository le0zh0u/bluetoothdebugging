const data = {
  adapterAvailable: false,
  adapterDiscovering: false
}

const isAdapterOpen = () => {
    return adapterAvailable;
}

const isAdapterDiscoverying = () => {
  return adapterDiscovering;
}

const openBluetoothAdapter = () => {
  console.log('openBluetoothAdapter doing')
  var that = this
  wx.openBluetoothAdapter({
    success: (res) => {
      console.log('openBluetoothAdapter success', res)
      that.data.adapterAvailable = true
    },
    fail: (res) => {
      console.log('openBluetoothAdapter fail', res)
      if (res.errCode === 10001) {
        wx.onBluetoothAdapterStateChange(function (res) {
          console.log('onBluetoothAdapterStateChange', res)
          that.data.adapterAvailable = res.available
          that.data.adapterDiscovering = res.discovering
        })
        return ;
      }

      // get state 
      // wx.getBluetoothAdapterState({
      //   success: (res) => {
      //     console.log(res)
      //     if(res.adapterState){
      //       that.setData({
      //         adapterAvailable: res.adapterState.available,
      //         adapterDiscovering: res.adapterState.discovering
      //       })
      //     } else {
      //       failMsg('获取蓝牙状态失败')
      //     }
      //   },
      //   fail: (res) => {
      //     console.log(res)
      //     failMsg('获取蓝牙状态失败')
      //   }
      // })
    }
  })
}


module.exports = {
  isAdapterOpen,
  isAdapterDiscoverying,

  openBluetoothAdapter
}