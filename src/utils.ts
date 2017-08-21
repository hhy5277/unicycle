module.exports = {
  isPackaged() {
    const { mainModule } = process
    return mainModule && mainModule.filename.indexOf('app.asar') > 0
  }
}