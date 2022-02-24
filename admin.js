const { Database, User, App } = require('koishi-core')
const { Time, Logger } = require('koishi-utils')
const { UserMg, VmMg } = require('./manager')

module.exports.apply = (ctx) => {
    ctx.command('vps/admin', '管理员操作', { authority: 3 })
        .usage('注意：所有管理员操作均对数据库直接操作，将不会验证数据的合规性，请在执行操作前务必确认已输入正确的指令')
    ctx.command('admin/tasks <node:string>','获取任务信息')
        .option('errors','-e 仅显示异常任务',{ value:1 })
        .option('limit','-l <limits:posint> 返回条数(默认 50)')
        .option('since','-s <since:int> 起始日期')
        .option('userfilter','-u <user:string> 用户筛选器(默认 bot)',{ fallback: 'bot@pve' })
        .option('vmid','-v <vmid:posint> VMID筛选器')
        .action(async ({session,options}, node) => {
            return JSON.stringify(await VmMg.getTasks(node,options))
        })
    /*ctx.command('admin/tuser <user:user> [...acts]','管理VPS用户信息')
        .example('/tuser @用户 vps add owner/helper <VMID> - 为用户设置/添加 VMID 为 owner/helper 的管理权限')
        .example('/tuser @用户 vps del <VMID> - 删除用户对 VMID 的管理权限')
        .action(async ({session}, user, ...acts) => {
            if (typeof user == "undefined") {
                return "请指定操作用户。"
            } else {
                let userid = user.split(":")?.[1]
                //let userData = await ctx.database.getUser(userpid[0], userpid[1])
                /*let vpsinfo = await ctx.database.get('vpsinfo', {
                    owner: userid,
                    $or: [{ $helpers: new RegExp(`.*${userid}.*`) }],
                  })*\/
                let vpsinfo = await ctx.database.get('vpsinfo', { id: vmid })
                switch (acts[0]) {
                    case 'vps':
                        
                        switch (acts[1]) {
                            case 'add':
                                await ctx.database.update('vpsinfo', [vpsinfo])
                                vpslist[acts[2]].push(Number(acts[3]))
                                let vps = JSON.stringify(vpslist)
                                await ctx.database.setUser(userpid[0], userpid[1], { vps })
                                return "已将该用户设置为 "+acts[3]+" 的 "+acts[2]
                            case 'del':
                                let idown = vpslist.owner.indexOf(Number(acts[2]))
                                let idhelp = vpslist.helper.indexOf(Number(acts[2]))
                                let status = false
                                if(idown > -1){vpslist.owner.splice(idown,1);status = true}
                                if(idhelp > -1){vpslist.helper.splice(idhelp,1);status = true}
                                if(status){
                                    let vps = JSON.stringify(vpslist)
                                    await ctx.database.setUser(userpid[0], userpid[1], { vps })
                                    return "已删除该用户下相应 vmid"
                                }
                                return "无可删除项"
                        }
                    default:
                        await session.send("该用户信息:\n"+JSON.stringify(userData))
                }
                
                
            }
        })*/
    ctx.command('admin/vmid','管理VPS信息')
    ctx.command('vmid.set <vmid:posint>','设置VPS信息')
        //.option('expdate','-d <expdate:text> 设置到期时间或续期时长')
        .option('price','-p <price:number> 设置VPS价格')
        .option('owner','-u <user:user> 设置拥有者')
        //.option('helpers','-h <user:user> 添加协作者')
        .option('refer','-r <user:user> 设置推荐人')
        .option('node','-n <node:string> 设置所属节点')
        .action(async ({session, options}, vmid) => {
            if (typeof vmid == "undefined") {return "请指定VMID。"}
            let [vpsinfo] = await ctx.database.get('vpsinfo', { 'id': vmid })
            //await session.send(JSON.stringify(vpsinfo))
            vpsinfo || (vpsinfo = { 'id':vmid, 'expdate':Time.parseDate(Date.now()+2678400000), 'price':0, 'owner':null, 'helpers': [], 'refer':null, 'node':null })
            if(options.expdate){vpsinfo.expdate = options.expdate}
            if(options.price){vpsinfo.price = options.price}
            if(options.owner){vpsinfo.owner = options.owner.split(':')[1]}
            if(options.refer){vpsinfo.refer = options.refer}
            if(options.node){vpsinfo.node = options.node}
            //await session.send(JSON.stringify(rows))
            //let id = vmid
            await ctx.database.update('vpsinfo', [vpsinfo])
            return "操作已进行"
        })
    ctx.command('vmid/renew <vmid:posint> <time>','续期 VPS')
        .example('/renew 100 10d - 将 100 号机器到期时间延长 10 天')
        .example('/renew 100 2077-1-1 - 将 100 号机器到期时间设置为 2077 年 1 月  1日')
        .action(async ({session}, vmid, ...dateSegments) => {
            if (!vmid) return "请指定VMID。"
            let [vpsinfo] = await ctx.database.get('vpsinfo', { 'id': vmid })
            const vpstime = vpsinfo.expdate.valueOf()
            const dateString = dateSegments.join('-')
            const time = (Time.parseTime(dateString)) || (Time.parseDate(dateString))
            let timestamp = null
            if(typeof time == 'number'){
                let timeold = +vpstime
                timestamp = timeold + time
            } else{
                timestamp = +time
            }

            if (Number.isNaN(timestamp) || timestamp > 2147483647000) {
              if (/^\d+$/.test(dateString)) {
                return `请输入合法的日期。你要输入的是不是 ${dateString}d？`
              } else {
                return '请输入合法的日期。'
              }
            } if (!dateString) {
                return '请输入续期/到期时间。'
              } else if (timestamp <= Date.now() && typeof time != 'number' ) {
                return '不能指定过去的时间为续期/到期时间。'
            }

            await ctx.database.update('vpsinfo',[{id: vmid, expdate: Time.parseDate(timestamp)}])
            return '已将 VPS '+vmid+' 延期至 '+ Time.parseDate(timestamp)
        })

}