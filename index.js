module.exports.name = 'tcloud'

const { Database, User, Time, Tables } = require('koishi')
const { UserMg, _VmMg } = require('./manager')
var dayjs = require('dayjs')
var customParseFormat = require('dayjs/plugin/customParseFormat')
dayjs.extend(customParseFormat)

const VPSoperate = require('./operate')
const VPSadmin = require('./admin')
const iKuaiPort = require('./port')
module.exports.VPSoperate = VPSoperate
module.exports.VPSadmin = VPSadmin
module.exports.iKuaiPort = iKuaiPort

module.exports.apply = (ctx) => {
  ctx.model.extend('user', {
    vpsselected: 'integer',
  })
  ctx.model.extend('vpsinfo', {
    id: 'integer',
    expdate: 'date',
    price: 'integer',
    owner: 'text',
    helpers: 'json',
    refer: 'text',
    node: 'string',
  }, {
    // 使用自增的主键值
    autoInc: false,
  })

  const VmMg = new _VmMg(ctx)
  ctx.command('vps', 'VPS管理',{ minInterval: 5000 })
  ctx.plugin(VPSoperate)
  ctx.plugin(VPSadmin)
  ctx.plugin(iKuaiPort)
  ctx.command('vps/server', '列出/选择机器')
    .option('select', '-s <vmid:posint> 选择默认操作的机器')
    .example('/server -s 100 选择 VMID 为 100 的机器作为默认机器')
    .action(async ({ options, session }) => {
      await session.observeUser(['id', 'vpsselected'])
        const vpsbyowner = JSON.parse(JSON.stringify(await ctx.database.get('vpsinfo', { owner: session.user.onebot })))
        const vpsbyhelper = JSON.parse(JSON.stringify(await ctx.database.get('vpsinfo', { helpers: new RegExp(`.*${session.user.onebot}.*`) })))
      //console.log(session.user.onebot)
      if(!vpsbyowner && !vpsbyhelper){
        return "您未在 Tcloud 购买 VPS 或未登记"
      }
      if (typeof options.select == 'undefined')
      {
        //const rows = await ctx.database.get('schedule', { id: session.user.id })
        let text = "您拥有的机器:"
        //console.log(vpsbyowner)
        for(let key in vpsbyowner){
          
          text += "\n -  " + vpsbyowner[key].id
          if(vpsbyowner[key].id == session.user.vpsselected){text+=" (已选择)"}
        }
        for(let key in vpsbyhelper){
          text += "\n -  "+ vpsbyhelper[key].id +" (协作者)"
          if(vpsbyhelper[key].id == session.user.vpsselected){text+=" (已选择)"}
        }
        if(text == "您拥有的机器:"){return "您未在 Tcloud 购买 VPS 或未登记"}else{return text}
      } else {
        const [_vpsbyowner] = JSON.parse(JSON.stringify(await ctx.database.get('vpsinfo', { id: options.select, owner: session.user.onebot })))
        const [_vpsbyhelper] = JSON.parse(JSON.stringify(await ctx.database.get('vpsinfo', { id: options.select, helpers: new RegExp(`.*${session.user.onebot}.*`) })))
        //console.log(_vpsbyowner)
        if(_vpsbyowner || _vpsbyhelper){
          await ctx.database.setUser('onebot', session.userId, { vpsselected: options.select })
          return "已选择 "+options.select+" 作为默认操作机器"
        }else {
          return "此机器ID不属于您"
        }
      }
    })
  ctx.command('vps/info', '机器信息')
  ctx.command('info.state [vmid:posint]', '机器状态', { minInterval: Time.minute/60 })
    .option('force', '-f 强制执行', { authority: 2 })
    .action(async ({session, options}, vmid) => {
   //return JSON.stringify(options)
      if(!vmid){
        await session.observeUser(['id', 'vpsselected'])
        vmid = await UserMg.getSelectedVmid(ctx, session.platform + ':' + session.userId)
        if(vmid === 0 && !options.force){
          return "您未在 Tcloud 购买 VPS 或未登记"
        }else if(vmid === false && !options.force){
          return "您有多个机器，请选择默认机器"
        }else if(options.force === true){
          return '请指定 vmid'
        }
      }
      //return String(!UserMg.hasVmid(ctx, session.platform + ':' + session.userId, vmid))
      if(!options.force && !await UserMg.hasVmid(ctx, session.platform + ':' + session.userId, vmid)){
         return "此机器 ID 不属于您"
        }
      let a = await VmMg.getVmState(vmid)
      //session.send(JSON.stringify(a))
      let stu = {
        "running": "运行中",
        "stopped": "已停止"
      }
      let node = await VmMg.getNode(vmid)
      if(!node){return `机器: ${vmid} (节点离线)`}
      let [vpsinfo] = await ctx.database.get('vpsinfo', { 'id': vmid })
      if(!vpsinfo?.id) return "机器不存在。"
            const vpstime = vpsinfo.expdate.valueOf()
      let agent = await _VmMg.request(1,"/nodes/"+node+"/qemu/"+vmid+"/agent/ping")==500
      let b = `机器: ${vmid} (${node})
==========
状态: ${stu[a.status]}\
${dayjs(vpstime).isAfter(dayjs().add(5, 'year')) ? "" : "\n到期时间: " + dayjs(vpstime).format('YYYY-MM-DD')}
运行时间: ${Time.format(Number(String(a.uptime)+'000')) || '节点离线'}
CPU 使用率: ${(a.cpu*100).toFixed(2)}% (${a.cpus} vCPUs)
最大内存: ${a.maxmem/1073741824 || 0} GB
Guest-Agent: ${ agent ? "未配置或未运行" : "正常"}`
      
    try {
    session.send(b)
    if(agent && stu[a.status] !== "已停止") {
      session.send("您的 Guest Agent 未正常运行, 后续可能无法正常使用网络")
    }
    } catch(err) {
      return '消息发送失败,账号可能被风控。'
    }
    return
    })
  ctx.command('info.node', '节点状态', { minInterval: Time.minute/3 })
    .action(async ({session}) => {
      let nodestatus = await VmMg.getNodeStatus()
      let stat = {
        "online" : "在线",
        "offline" : "离线",
      }
      let b = `节点状态
-----------------`
      for (let key in nodestatus) {
        b += `\n${key}    ${stat[nodestatus[key]]}`
      }
      return b
    })
  ctx.command('info.cluster', '集群状态')
    .action(async ({session}) => {
      return JSON.stringify(await VmMg.getClusterStatus())
    })
}

