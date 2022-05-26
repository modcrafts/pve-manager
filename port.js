const Config = require('./config')
const _iKuai = require("./ikuai")
const ikuai = new _iKuai(Config.ikuai.address, Config.ikuai.user, Config.ikuai.password)

module.exports.apply = (ctx) => {
    ikuai.run()
}