const Config = require('./config')
const pveajs = require("./pvea")
const pve = new pveajs(Config.pve.address, Config.pve.user, Config.pve.password)

class UserMg {
    static async getSelectedVmid(ctx,user) {
        let userpid = await user.split(":")
        const userData = await ctx.database.getUser(userpid[0], userpid[1])
        
        if (!userData.vpsselected) {
            /* WIP-自动选择
            const [vpsbyowner] = await ctx.database.get('vpsinfo', { owner: userpid[1] })
            const [vpsbyhelper] = await ctx.database.get('vpsinfo', { helpers: new RegExp(`.*${userpid[1]}.*`) })
            if (vpslist.owner.length == 1) {
                vpslist.selected = vpslist.owner[0]
                ctx.database.setUser(userpid[0], userpid[1], { vps: JSON.stringify(vpslist) })
                return vpslist.owner[0]
            } else if (vpslist.helper.length == 1) {
                vpslist.selected = vpslist.helper[0]
                ctx.database.setUser(userpid[0], userpid[1], { vps: JSON.stringify(vpslist) })
                return vpslist.helper[0]
            } else {
                return false
            }*/
            return false
        } 
        const _vpsbyowner = JSON.parse(JSON.stringify(await ctx.database.get('vpsinfo', { id: userData.vpsselected, owner: userpid[1] })))
        const _vpsbyhelper = JSON.parse(JSON.stringify(await ctx.database.get('vpsinfo', { id: userData.vpsselected, helpers: new RegExp(`.*${userpid[1]}.*`) })))
        if (_vpsbyowner || _vpsbyhelper) {
            return userData.vpsselected
        }
        ctx.database.setUser(userpid[0], userpid[1], { vpsselected: null })
        return 0

    }
    static async hasVmid(ctx, user, vmid) {
        let userpid = await user.split(":")
        const vpsbyowner = JSON.parse(JSON.stringify(await ctx.database.get('vpsinfo', { id: vmid, owner: userpid[1] })))
        const vpsbyhelper = JSON.parse(JSON.stringify(await ctx.database.get('vpsinfo', { id: vmid, helpers: new RegExp(`.*${userpid[1]}.*`) })))
        if(!vpsbyowner && !vpsbyhelper){return false}
            console.log("aaaaaaa")
          console.log(await ctx.database.get('vpsinfo', { id: vmid, owner: userpid[1] }))
          //console.log(vpsbyhelper)
        if (vpsbyowner?.owner == userpid[1] || vpsbyhelper?.[0].helpers.includes(parseInt(userpid[1]))) {
            return true
        } else { return false }
    }
    
}
class VmMg {
    static async getNode(vmid) {
        /*
        const [vpsinfo] = await ctx.database.get('vpsinfo', { id: vmid },['node'])
            //await session.send(JSON.stringify(vpsinfo))
        if(vpsinfo.node){return vpsinfo.node}*/
        var nodes = await pve.run(async () => {
            return await pve.getNodes()
        })
        var vmidlist = {}
        //console.time('start')
        let nodelist = []
        for (let key in nodes) {
            if (nodes[key].status == 'online') {
            nodelist.push(nodes[key].node)
            }
        }
        const anode = await Promise.resolve(nodelist)
        const promises = []
        async function getvm(node){
            let a = await pve.run(async () => {
                return await pve.listQemuVms(node)
            })
            for (let key in a){
                vmidlist[Number(a[key].vmid)] = node
            }
            return
        }
        anode.forEach(num => {
            promises.push(getvm(num))
        })
        await Promise.all(promises)
        /*
        for (let keys = 0; keys<anode.length; keys++) {
            console.time(keys)
            let a = await pve.run(async () => {
                return await pve.listQemuVms(anode[keys])
            })
            for (let key in a){
                vmidlist[Number(a[key].vmid)] = anode[keys]
            }
            
            console.timeEnd(keys)
        }*/
        console.log(vmidlist)
        console.log(vmidlist[vmid])
        if (vmidlist[vmid]) {
            //console.timeEnd('start')
            //ctx.database.update('vpsinfo', { id: vmid ,node: vmidlist[vmid]})
            return vmidlist[vmid]
        } else {
            console.log('节点返回false')
            return false
        }

    }
    static async getClusterStatus() {
        return await pve.run(async () => {
            return await pve.getClusterResources()
        })
    }
    static async getNodeStatus(node) {
        return await pve.run(async () => {
            var nodes = await pve.getNodes()
            var nodesat = {}
            for (let key in nodes) {
                nodesat[nodes[key].node] = nodes[key].status
            }
            if(!node){return nodesat}else{return nodesat[node]}
        })
    }

    static async getVmState(vmid) {
        return await pve.run(async () => {
            var node = await this.getNode(vmid)
            if(!node){return false}
            return await pve.getCurrentQemuVmState(node,vmid)
        })
    }

    static async stopVm(vmid) {
        await pve.run(async () => {
            var node = await this.getNode(vmid)
            await pve.stopQemuVm(node,vmid)
        })
        return true
    }
    static async startVm(vmid) {
        await pve.run(async () => {
            var node = await this.getNode(vmid)
            await pve.startQemuVm(node,vmid)
        })
        return true
    }
    static async shutdownVm(vmid) {
        await pve.run(async () => {
            var node = await this.getNode(vmid)
            await pve.shutdownQemuVm(node,vmid)
        })
        return true
    }
    static async rebootVm(vmid) {
        await pve.run(async () => {
            var node = await this.getNode(vmid)
            await pve.rebootQemuVm(node,vmid)
        })
        return true
    }
    static async resetVm(vmid) {
        await pve.run(async () => {
            var node = await this.getNode(vmid)
            await pve.resetQemuVm(node,vmid)
        })
        return true
    }
    static async getTasks(node,params) {
        console.log(params)
        return await pve.run(async () => {
            if(!node){return false}
            return await pve.getNodeTasks(node, params)
        })
    }
}

module.exports = { UserMg, VmMg }