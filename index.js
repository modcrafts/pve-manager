module.exports.name = 'tcloud'

const { Database, User, Tables } = require('koishi-core')
const { UserMg, VmMg } = require('./manager')
const { Time, Logger } = require('koishi-utils')

const VPSoperate = require('./operate')
const VPSadmin = require('./admin')
module.exports.VPSoperate = VPSoperate
module.exports.VPSadmin = VPSadmin

Tables.extend('vpsinfo', {
  // 主键名称，将用于 database.get() 等方法
  primary: 'id',
  // 所有数据值唯一的字段名称构成的列表
  unique: [],
  fields: {
    id: 'int',
    expdate: 'timestamp',
    price: 'int',
    owner: 'varchar(500)',
    helpers: 'varchar(500)',
    refer: 'varchar(500)',
    node: 'string',
  },
})
Database.extend('koishi-plugin-mysql', ({ tables }) => {
  tables.user.vps = 'json'
  tables.vpsinfo = {
    id: 'int',
    expdate: 'timestamp',
    price: 'int',
    owner: 'varchar(500)',
    helpers: 'varchar(500)',
    node: 'string',
  }
})


module.exports.apply = (ctx) => {
  ctx.command('vps', 'VPS管理',{ minInterval: 5000 })
  ctx.plugin(VPSoperate)
  ctx.plugin(VPSadmin)
  ctx.command('vps/server', '列出/选择机器')
    .option('select', '-s <vmid:posint> 选择默认操作的机器')
    .example('/server -s 100 选择 VMID 为 100 的机器作为默认机器')
    .action(async ({ options, session }) => {
      await session.observeUser(['id', 'vps'])
      if(session.user.vps == null){
        return "您未在 Tcloud 购买 VPS 或未登记"
      }
      let vpslist = JSON.parse(session.user.vps)
      if (typeof options.select == 'undefined')
      {
        //const rows = await ctx.database.get('schedule', { id: session.user.id })
        let text = "您拥有的机器:"
        for(let key in vpslist.owner){
          text += "\n -  "+vpslist.owner[key]
          if(vpslist.owner[key] == vpslist.selected){text+=" (已选择)"}
        }
        for(let key in vpslist.helper){
          text += "\n -  "+vpslist.helper[key]+" (协作者)"
          if(vpslist.helper[key] == vpslist.selected){text+=" (已选择)"}
        }
        if(text == "您拥有的机器:"){return "您未在 Tcloud 购买 VPS 或未登记"}else{return text}
      } else {
        if(vpslist.owner.includes(options.select) || vpslist.helper.includes(options.select)){
          vpslist.selected = options.select
          session.user.vps = JSON.stringify(vpslist)
          return "已选择 "+options.select+" 作为默认操作机器"
        }else {
          return "此机器ID不属于您"
        }
      }
    })
  ctx.command('vps/info', '机器信息')
  ctx.command('info.state [vmid:posint]', '机器状态', { minInterval: Time.minute/3 })
    .option('force', '-f 强制执行', { authority: 2 })
    .action(async ({session, options}, vmid) => {
   //return JSON.stringify(options)
      if(!vmid){
        await session.observeUser(['id', 'vps'])
        if(session.user.vps == null && !options.force){
          return "您未在 Tcloud 购买 VPS 或未登记"
        }else if(options.force === true){
          return '请指定 vmid'
        }else {
        vmid = await UserMg.getSelectedVmid(ctx, session.platform + ':' + session.userId)
        }
      }
      if(vmid === 0){return "您未在 Tcloud 购买 VPS 或未登记"}
      if(!vmid){return "您有多个机器，请选择默认机器"}
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
      let b = `机器: ${vmid} (${node})
==========
状态: ${stu[a.status]}
运行时间: ${Time.formatTime(Number(String(a.uptime)+'000')) || '节点离线'}
CPU 使用率: ${(a.cpu*100).toFixed(2)}% (${a.cpus} vCPUs)
最大内存: ${a.maxmem/1073741824 || 0} GB`
      return b
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

