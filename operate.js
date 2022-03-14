const { UserMg, VmMg } = require('./manager')

module.exports.apply = (ctx) => {
    ctx.command('vps/operate <action:string>', '操作服务器')
        //.option('target', '-t <vmid:posint> 指定操作的服务器(不填默认操作已选择服务器)')
        .usage('可用的操作:\nstart - 启动\nshutdown - 关机\nreboot - 重启\nstop - 终止\nreset - 重置')
        .option('vmid', '-v <vmid:posint> 指定 VMID')
        .option('force', '-f 强制执行', { authority: 2 })
        .action(async ({ options, session }, action) => {
            let vmid = options.vmid
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

            switch(action){
                case 'start':
                    VmMg.startVm(vmid)
                    return '启动请求已发送'
                case 'shutdown':
                    VmMg.shutdownVm(vmid)
                    return '关机请求已发送'
                case 'reboot':
                    VmMg.rebootVm(vmid)
                    return '重启请求已发送'
                case 'stop':
                    VmMg.stopVm(vmid)
                    return '终止请求已发送'
                case 'reset':
                    VmMg.resetVm(vmid)
                    return '强制重启请求已发送'
                default:
                    return '请输入正确的操作类型。'
            }
        })
}