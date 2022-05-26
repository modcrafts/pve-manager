// libraries
const axios = require('axios')
const colors = require('colors')
const qs = require('querystring')
const https = require('https');
const CryptoJS = require('crypto-js');
// ikuai module
class _iKuai {

  constructor(host, user, pass,AgentOpts=null) {
    this.host = "https://"+host;
    this.user = user
    this.pass = pass
    this.apiUrl = this.host+'/Action/call'
    this.sesskey = ''
    this.tokenTimeStamp = 0
    this.authenticated = false
    if (AgentOpts == null)
      console.warn('WARNING: HTTPS Agent is Unverified Client-Side!')
    //Note: View https://stackoverflow.com/questions/51363855/how-to-configure-axios-to-use-ssl-certificate
    //for configuration questions.
    this.Agent = (AgentOpts == null)?new https.Agent({
      rejectUnauthorized: false
    }):new https.Agent(AgentOpts);
  }

  async run(callback) {

    console.log(`${colors.blue('Note: ')  }Starting authentication process...`)

    const passwd = CryptoJS.MD5(this.pass).toString();
    const pass = new Buffer.from("salt_11" + this.pass).toString('base64')

    const options = {
      method: 'POST',
      data: {
        username: this.user, 
        passwd: passwd,
        pass: pass,
      },
      url: `${this.host}/Action/login`,
      headers: {
        'Content-Type': 'application/json'
      },
      httpsAgent: this.Agent,
    }
    await axios(options)
      .then(res => {
        if(res.data.Result !== 10000){
          throw new Error(res.data.ErrMsg)
        }
        this.sesskey = res.headers["set-cookie"][0]
        this.authenticated = true
        this.tokenTimeStamp = new Date().getTime()
        
        console.log(this.sesskey)
      })
      .catch(err => {
        console.log(colors.red('Err: ') + err)
      })

    if (this.authenticated === true) {
      console.log(`${colors.blue('Note: ')  }Authentication successful!`)
    } else {
      console.log(`${colors.red('Err: ')  }Authentication failed.`)
    }

    if (callback) {
      return await callback()
    }
  }

  async authCheck() {
    const currentTime = new Date().getTime()
    if (currentTime - this.tokenTimeStamp > 60 * 60 * 1000) {
      this.run()
    }
  }

  async get(url, param) {

    // see if token expired, if so reauthenticate
    await this.authCheck()

    console.log(`${colors.blue('Note: ')  }Sending get request ${url}...`)
    var result;

    const options = {
      method: 'GET',
      url: this.apiUrl + url,
      params: param,
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'CSRFPreventionToken': this.csrfToken,
        'Cookie': this.ticket
      },
      httpsAgent: this.Agent

    }

    await axios(options)
      .then(res => {
        console.log(`${colors.blue('Note: ')  }received response for ${url}.`)
        result = res.data.data
      })
      .catch(err => {
        result = err.response.status
        console.log(`${colors.red('Err: ') + err.response.status}: ${err.response.statusText}`)
      })

    return result;
  }

  async post(url, data) {

    // see if token expired, if so reauthenticate
    await this.authCheck()

    console.log(`${colors.blue('Note: ')}Sending post request ${url}...`)
    var result;

    const options = {
      method: 'POST',
      url: this.apiUrl + url,
      data: qs.encode(data),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'CSRFPreventionToken': this.csrfToken,
        'Cookie': this.ticket
      },
      httpsAgent: this.Agent

    }

    await axios(options)
      .then(res => {
        result = res
      })
      .catch(err => {
        result = err.response.status
        console.log(`${colors.red('Err: ') + err.response.status}: ${err.response.statusText}`)
      })

    return result;
  }

  async put(url, data) {

    // see if token expired, if so reauthenticate
    await this.authCheck()

    console.log(`${colors.blue('Note: ')}Sending put request ${url}...`)
    var result;

    const options = {
      method: 'PUT',
      url: this.apiUrl + url,
      data: qs.encode(data),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'CSRFPreventionToken': this.csrfToken,
        'Cookie': this.ticket
      },
      httpsAgent: this.Agent

    }

    await axios(options)
      .then(res => {
        result = res
      })
      .catch(err => {
        result = err.response.status
        console.log(`${colors.red('Err: ') + err.response.status}: ${err.response.statusText}`)
      })

    return result;
  }

  async delete(url, data) {
    // see if token expired, if so reauthenticate
    await this.authCheck()

    console.log(`${colors.blue('Note: ')}Sending put request ${url}...`)
    var result;

    const options = {
      method: 'DELETE',
      url: this.apiUrl + url,
      data: qs.encode(data),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'CSRFPreventionToken': this.csrfToken,
        'Cookie': this.ticket
      },
      httpsAgent: this.Agent

    }

    await axios(options)
      .then(res => {
        result = res
      })
      .catch(err => {
        result = err.response.status
        console.log(`${colors.red('Err: ') + err.response.status}: ${err.response.statusText}`)
      })

    return result;
  }


  // version
  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/version
  async apiVersion() {
    return await this.get('/version')
  }

  // storage
  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/storage
  async getStorage(param) {
    return await this.get('/storage', param)
  }

  async createStorage(param) {
    return await this.post('/storage', param)
  }

  // storage > {storage}
  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/storage/{storage}
  async getStorageConfig(storage) {
    return await this.get(`/storage/${storage}`)
  }

  async deleteStorageConfig(storage) {
    return await this.delete(`/storage/${storage}`)
  }

  async updateStorageConfig(storage, param) {
    return await this.put(`/storage/${storage}`, param)
  }

  // pools
  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/pools
  async getPools() {
    return await this.get('/pools')
  }

  // pools > {poolid}
  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/pools/{poolid}
  async getPoolConfig(poolid) {
    return await this.get(`/pools/${poolid}`)
  }

  async deletePoolConfig(poolid) {
    return await this.delete(`/pools/${poolid}`)
  }

  async updatePoolConfig(poolid, param) {
    return await this.put(`/pools/${poolid}`, param)
  }

  // nodes
  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes
  async getNodes() {
    return await this.get('/nodes')
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/wakeonlan
  async wakeNode(node) {
    return await this.post(`/nodes/${node}/wakeonlan`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/version
  async getNodeVersion(node) {
    return await this.get(`/nodes/${node}/version`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/time
  async getNodeTime(node) {
    return await this.get(`/nodes/${node}/time`)
  }

  async updateNodeTimeZone(node, param) {
    return await this.get(`/nodes/${node}/time`, param)
  }

  // https://pve.proxmo x.com/pve-docs/api-viewer/index.html#/nodes/{node}/syslog
  async getNodeLog(node, param) {
    return await this.get(`/nodes/${node}/syslog`, param)
  }
  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/subscription
  async getNodeSubscriptionStatus(node) {
    return await this.get(`/nodes/${node}/subscription`)
  }

  async deleteNodeSubscriptionKey(node) {
    return await this.delete(`/nodes/${node}/subscription`)
  }

  async setNodeSubscriptionKey(node) {
    return await this.put(`/nodes/${node}/subscription`)
  }

  async updateNodeSubscrpitionKey(node) {
    return await this.post(`/nodes/${node}/subscription`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/stopall
  async stopAll(node, param) {
    return await this.post(`/nodes/${node}/stopall`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/status
  async getNodeStatus(node) {
    return await this.get(`/nodes/${node}/status`)
  }

  async rebootNode(node) {
    return await this.post(`/nodes/${node}/status`, {
      command: 'reboot'
    })
  }

  async shutdownNode(node) {
    return await this.post(`/nodes/${node}/status`, {
      command: 'shutdown'
    })
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/startall
  async startAll(node, param) {
    return await this.post(`/nodes/${node}/startall`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/rrddata
  async getNodeRRDData(node) {
    return await this.get(`/nodes/${node}/rrddata`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/report
  async getNodeReport(node) {
    return await this.get(`/nodes/${node}/report`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/netstat
  async getNodeNetstat(node) {
    return await this.get(`/nodes/${node}/netstat`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/migrateall
  async migrateAll(node, param) {
    return await this.post(`/nodes/${node}/migrateall`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/journal
  async getNodeJournal(node) {
    return await this.get(`/nodes/${node}/journal`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/hosts
  async getNodeHostname(node) {
    return await this.get(`/nodes/${node}/hosts`)
  }

  async setNodeHostname(node) {
    return await this.post(`/nodes/${node}/hosts`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/dns
  async getNodeDnsSettings(node) {
    return await this.get(`/nodes/${node}/dns`)
  }

  async setNodeDnsSettings(node, param) {
    return await this.put(`/nodes/${node}/dns`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/cpu
  async listNodeCpu(node) {
    return await this.get(`/nodes/${node}/cpu`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/config
  async getNodeConfig(node) {
    return await this.get(`/nodes/${node}/config`)
  }

  async updateNodeConfig(node, param) {
    return await this.put(`/nodes/${node}/config`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/aplinfo
  async getNodeAplInfo(node) {
    return await this.get(`/nodes/${node}/aplinfo`)
  }

  // nodes > vzdump
  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/vzdump
  async createBackup(node, param) {
    return await this.post(`/nodes/${node}/vzdump`, param)
  }

  async getBackupConfig(node, param) {
    return await this.get(`/nodes/${node}/vzdump/extractconfig`, param)
  }

  // node > tasks
  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/tasks
  async getNodeTasks(node, param) {
    return await this.get(`/nodes/${node}/tasks`, param)
  }

  //https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/tasks/{upid}
  // No description on what this does on proxmox api docs, I will see later.
  async getNodeTaskNotDocumented(node, upid) {
    return await this.get(`/nodes/${node}/tasks/${upid}`)
  }

  async stopTask(node, upid) {
    return await this.delete(`/nodes/${node}/tasks/${upid}`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/tasks/{upid}/log
  async getTaskLog(node, upid, param) {
    return await this.get(`/nodes/${node}/tasks/${upid}/log`, param)
  }

  //https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/tasks/{upid}/status
  async getTaskStatus(node, upid) {
    return await this.get(`/nodes/${node}/tasks/${upid}/status`)
  }

  // node > storage
  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/storage
  async getDatastoreStatus(node, param) {
    return await this.get(`/nodes/${node}/storage`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/storage/{storage}
  // No description on what this does on proxmox api docs, I will see later.
  async getDatastoreNotDocumented(node, storage) {
    return await this.get(`/nodes/${node}/storage/${storage}`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/storage/{storage}/status
  async getStorageStatus(node, storage) {
    return await this.get(`/nodes/${node}/storage/${storage}/status`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/storage/{storage}/rrddata
  async getStorageRRDData(node, storage, param) {
    return await this.get(`/nodes/${node}/storage/${storage}/rrddata`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/storage/{storage}/content
  async getStorageContent(node, storage, param) {
    return await this.get(`/nodes/${node}/storage/${storage}/content`, param)
  }

  async allocateDiskImage(node, storage, param) {
    return await this.post(`/nodes/${node}/storage/${storage}/content`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/storage/{storage}/content/{volume}
  async getVolumeAttributes(node, storage, volume, param) {
    return await this.get(`/nodes/${node}/storage/${storage}/content/${volume}`, param)
  }

  async deleteVolume(node, storage, volume, param) {
    return await this.delete(`/nodes/${node}/storage/${storage}/content/${volume}`, param)
  }

  // node > services
  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/services/{service}/reload
  async reloadService(node, service) {
    return await this.post(`/nodes/${node}/services${service}/reload`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/services/{service}/restart
  async restartService(node, service) {
    return await this.post(`/nodes/${node}/services${service}/restart`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/services/{service}/start
  async startService(node, service) {
    return await this.post(`/nodes/${node}/services${service}/start`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/services/{service}/stop
  async stopService(node, service) {
    return await this.post(`/nodes/${node}/services${service}/stop`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/services/{service}/state
  async getServiceState(node, service) {
    return await this.get(`/nodes/${node}/services${service}/state`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/services
  async listServices(node) {
    return await this.get(`/nodes/${node}/services`)
  }

  // lxc containers
  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc
  async listLxcContainers(node) {
    return await this.get(`/nodes/${node}/lxc`)
  }

  async createLxcContainer(node, param) {
    return await this.post(`/nodes/${node}/lxc`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/template
  async createLxcTemplate(node, vmid) {
    return await this.post(`/nodes/${node}/lxc/${vmid}/template`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/rrddata
  async getLxcRRDData(node, vmid, param) {
    return await this.get(`/nodes/${node}/lxc/${vmid}/rrddata`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/resize
  async resizeLxcContainer(node, vmid, param) {
    return await this.post(`/nodes/${node}/lxc/${vmid}/resize`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/pending
  async getLxcPending(node, vmid) {
    return await this.get(`/nodes/${node}/lxc/${vmid}/pending`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/config
  async getLxcConfig(node, vmid) {
    return await this.get(`/nodes/${node}/lxc/${vmid}/config`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/clone
  async cloneLxcContainer(node, vmid, param) {
    return await this.post(`/nodes/${node}/lxc/${vmid}/clone`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/status/suspend
  async suspendLxcContainer(node, vmid) {
    return await this.post(`/nodes/${node}/lxc/${vmid}/status/suspend`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/status/stop
  async stopLxcContainer(node, vmid) {
    return await this.post(`/nodes/${node}/lxc/${vmid}/status/stop`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/status/start
  async startLxcContainer(node, vmid) {
    return await this.post(`/nodes/${node}/lxc/${vmid}/status/start`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/status/shutdown
  async shutdownLxcContainer(node, vmid) {
    return await this.post(`/nodes/${node}/lxc/${vmid}/status/shutdown`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/status/resume
  async resumeLxcContainer(node, vmid) {
    return await this.post(`/nodes/${node}/lxc/${vmid}/status/resume`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/status/reboot
  async rebootLxcContainer(node, vmid) {
    return await this.post(`/nodes/${node}/lxc/${vmid}/status/reboot`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/status/current
  async getLxcContainerStatus(node, vmid) {
    return await this.get(`/nodes/${node}/lxc/${vmid}/status/current`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}
  async deleteLxcContainer(node, vmid, param) {
    return await this.delete(`/nodes/${node}/lxc/${vmid}`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/snapshot
  async getLxcSnapshot(node, vmid) {
    return await this.get(`/nodes/${node}/lxc/${vmid}/snapshot`)
  }

  async createLxcSnapshot(node, vmid, param) {
    return await this.post(`/nodes/${node}/lxc/${vmid}/snapshot`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/snapshot/{snapname}
  async deleteLxcSnapshot(node, vmid, snapName, param) {
    return await this.delete(`/nodes/${node}/lxc/${vmid}/snapshot/${snapName}`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/snapshot/{snapname}/config
  async getLxcSnapshotConfig(node, vmid, snapName) {
    return await this.get(`/nodes/${node}/lxc/${vmid}/snapshot/${snapName}/config`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/snapshot/{snapname}/config
  async updateLxcSnapshotMetadata(node, vmid, snapName, param) {
    return await this.put(`/nodes/${node}/lxc/${vmid}/snapshot/${snapName}/config`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/snapshot/{snapname}/rollback
  async rollbackLxcContainer(node, vmid, snapName) {
    return await this.post(`/nodes/${node}/lxc/${vmid}/snapshot/${snapName}/rollback`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/firewall
  async getLxcFirewallRefs(node, vmid) {
    return await this.get(`/nodes/${node}/lxc/${vmid}/firewall/refs`)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/firewall/options
  async getLxcFirewallOptions(node, vmid) {
    return await this.get(`/nodes/${node}/lxc/${vmid}/firewall/options`)
  }

  async setLxcFirewallOptions(node, vmid, param) {
    return await this.put(`/nodes/${node}/lxc/${vmid}/firewall/options`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/firewall/log
  async getLxcFirewallLog(node, vmid, param) {
    return await this.get(`/nodes/${node}/lxc/${vmid}/firewall/log`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/firewall/rules
  async getLxcFirewallRules(node, vmid) {
    return await this.get(`/nodes/${node}/lxc/${vmid}/firewall/rules`)
  }

  async createLxcFirewallRule(node, vmid, param) {
    return await this.post(`/nodes/${node}/lxc/${vmid}/firewall/rules`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/firewall/ipset
  async getLxcFirewallIPSets(node, vmid) {
    return await this.get(`/nodes/${node}/lxc/${vmid}/firewall/ipset`)
  }

  async createLxcFirewallIPSet(node, vmid, param) {
    return await this.post(`/nodes/${node}/lxc/${vmid}/firewall/ipset`, param)
  }

  // https://pve.proxmox.com/pve-docs/api-viewer/index.html#/nodes/{node}/lxc/{vmid}/firewall/aliases
  async getLxcFirewallAliases(node, vmid) {
    return await this.get(`/nodes/${node}/lxc/${vmid}/firewall/aliases`)
  }

  async createLxcFirewallAlias(node, vmid, param) {
    return await this.post(`/nodes/${node}/lxc/${vmid}/firewall/aliases`, param)
  }
  async listQemuVms(node) {
    return await this.get(`/nodes/${node}/qemu/`)
  }
  async getQemuVmConfig(node, vmid) {
    return await this.get(`/nodes/${node}/qemu/${vmid}/config`)
  }
  async resizeQemuVm(node, vmid,param) {

    return await this.put(`/nodes/${node}/qemu/${vmid}/resize`, param)
  }
  async setQemuVmConfig(node, vmid,param) {
    return await this.post(`/nodes/${node}/qemu/${vmid}/config`,param)
  }
  async checkQemuVmFeature(node, vmid) {
    return await this.get(`/nodes/${node}/qemu/${vmid}/feature`)
  }
  async getQemuVmMigrationPreconditions(node, vmid) {
    return await this.get(`/nodes/${node}/qemu/${vmid}/migration`)
  }
   async cloneQemuVm(node, vmid, param) {
    return await this.post(`/nodes/${node}/qemu/${vmid}/clone`, param)
  }
  async suspendQemuVm(node, vmid) {
    return await this.post(`/nodes/${node}/qemu/${vmid}/status/suspend`)
  }
  async stopQemuVm(node, vmid) {
    return await this.post(`/nodes/${node}/qemu/${vmid}/status/stop`)
  }
  async startQemuVm(node, vmid) {
    return await this.post(`/nodes/${node}/qemu/${vmid}/status/start`)
  }
  async shutdownQemuVm(node, vmid) {
    return await this.post(`/nodes/${node}/qemu/${vmid}/status/shutdown`)
  }
  async resetQemuVm(node, vmid) {
    return await this.post(`/nodes/${node}/qemu/${vmid}/status/reset`)
  }
  async rebootQemuVm(node, vmid) {
    return await this.post(`/nodes/${node}/qemu/${vmid}/status/reboot`)
  }
  async execQemuMonitorCommand(node, vmid, param) {
    return await this.post(`/nodes/${node}/qemu/${vmid}/monitor`, param)
  }
  async moveQemuVmDisk(node, vmid, param) {
    return await this.post(`/nodes/${node}/qemu/${vmid}/status/reboot`, param)
  }
  async getQemuVmPendingConfig(node, vmid) {
    return await this.get(`/nodes/${node}/qemu/${vmid}/pending`)
  }
  async getQemuSnapshot(node, vmid) {
    return await this.get(`/nodes/${node}/qemu/${vmid}/snapshot`)
  }
  async createQemuSnapshot(node, vmid, param) {
    return await this.post(`/nodes/${node}/qemu/${vmid}/snapshot`, param)
  }
  async deleteQemuSnapshot(node, vmid, snapName, param) {
    return await this.delete(`/nodes/${node}/qemu/${vmid}/snapshot/${snapName}`)
  }
  async getQemuSnapshotConfig(node, vmid, snapName) {
    return await this.get(`/nodes/${node}/qemu/${vmid}/snapshot/${snapName}/config`)
  }
  async updateQemuSnapshotMetadata(node, vmid, snapName, param) {
    return await this.put(`/nodes/${node}/qemu/${vmid}/snapshot/${snapName}/config`, param)
  }
  async rollbackQemuVm(node, vmid, snapName) {
    return await this.post(`/nodes/${node}/qemu/${vmid}/snapshot/${snapName}/rollback`)
  }
  async createQemuVm(node, param) {
    return await this.post(`/nodes/${node}/qemu`, param)
  }
  async getQemuVmCloudinitConfig(node, vmid) {
    return await this.get(`/nodes/${node}/qemu/${vmid}/cloudinit/dump`)
  }
  async makeQemuVmTemplate(node, vmid, param) {
    return await this.post(`/nodes/${node}/qemu/${vmid}/template`, param)
  }
  async createQemuVmTermProxy(node, vmid, param) {
    return await this.post(`/nodes/${node}/qemu/${vmid}/termproxy`, param)
  }
    async getQemuFirewallRefs(node, vmid) {
      return await this.get(`/nodes/${node}/qemu/${vmid}/firewall/refs`)
    }
    async getQemuFirewallOptions(node, vmid) {
      return await this.get(`/nodes/${node}/qemu/${vmid}/firewall/options`)
    }
    async setQemuFirewallOptions(node, vmid, param) {
      return await this.put(`/nodes/${node}/qemu/${vmid}/firewall/options`, param)
    }
    async getQemuFirewallLog(node, vmid, param) {
      return await this.get(`/nodes/${node}/qemu/${vmid}/firewall/log`, param)
    }
    async getQemuFirewallRules(node, vmid) {
      return await this.get(`/nodes/${node}/qemu/${vmid}/firewall/rules`)
    }

    async createQemuFirewallRule(node, vmid, param) {
      return await this.post(`/nodes/${node}/qemu/${vmid}/firewall/rules`, param)
    }
    async getQemuFirewallIPSets(node, vmid) {
      return await this.get(`/nodes/${node}/qemu/${vmid}/firewall/ipset`)
    }

    async createQemuFirewallIPSet(node, vmid, param) {
      return await this.post(`/nodes/${node}/qemu/${vmid}/firewall/ipset`, param)
    }
    async createQemuFirewallIPSet(node, vmid, param) {
      return await this.post(`/nodes/${node}/qemu/${vmid}/firewall/ipset`, param)
    }
    async unlinkQemuVmDisk(node, vmid, param) {
      return await this.put(`/nodes/${node}/qemu/${vmid}/unlink`, param)
    }
    async createQemuVmVncProxy(node, vmid, param) {
      return await this.post(`/nodes/${node}/qemu/${vmid}/vncproxy`, param)
    }
    async getQemuRRDData(node, vmid, param) {
      return await this.post(`/nodes/${node}/qemu/${vmid}/rrddata`, param)
    }
    async execGetQemuAgentCommand(node, vmid, command) {
      return await this.get(`/nodes/${node}/qemu/${vmid}/agent/${command}`)
    }
    async execPostQemuAgentCommand(node, vmid, command, params) {
      return await this.get(`/nodes/${node}/qemu/${vmid}/agent/${command}`, params)
    }
  async deleteQemuVm(node, vmid, param) {
    return await this.delete(`/nodes/${node}/qemu/${vmid}`, param)
  }
  async getCurrentQemuVmState(node, vmid) {
    return await this.get(`/nodes/${node}/qemu/${vmid}/status/current`)
  }
  ////Node Firewall/////
  async getNodeFirewall(node) {
    return await this.get(`/nodes/${node}/firewall`)
  }
  async getNodeFirewallRules(node) {
    return await this.get(`/nodes/${node}/firewall/rules`)
  }
  async getNodeNetwork(node){
    return await this.get(`/nodes/${node}/network`)
  }
  async getNodeSDN(node){
    return await this.get(`/nodes/${node}/sdn`)
  }
  async getNodeCapabilities(node){
    return await this.get(`/nodes/${node}/capabilities`)
  }
  ////Node Ceph////
  async getCeph(node){
    return await this.get(`/nodes/${node}/ceph`)
  }
  async getCephPools(node){
    return await this.get(`/nodes/${node}/ceph/pools`)
  }
  async getCephPool(node,pool){
    return await this.get(`/nodes/${node}/ceph/pools/${pool}`)
  }
  async getCephFS(node){
    return await this.get(`/nodes/${node}/ceph/fs`)
  }
  async getCephFSi(node,name){
    return await this.get(`/nodes/${node}/ceph/fs/${name}`)
  }
  ////Cluster/////
  async getCluster(){
    return await this.get('/cluster')
  }
  async getClusterResources(){
    return await this.get('/cluster/status')
  }
  async getNextVMID(){
    return await this.get('/cluster/nextid')
  }
  async getClusterFirewall(){
    return await this.get('/cluster/firewall')
  }
  async getClusterFirewallGroups(){
    return await this.get('/cluster/firewall/groups')
  }
  async getClusterFirewallIPSets(){
    return await this.get('/cluster/firewall/ipset')
  }
  async getClusterSDN(){
    return await this.get('/cluster/sdn')
  }
  async getClusterSDNvnets(){
    return await this.get('/cluster/sdn/vnets')
  }
  async addHAResource(ID,opts={}){
    opts.isContainer= opts.isContainer||false;
    return await this.post('/cluster/ha/resources',{sid:(isContainer)?'vm:'+ID:'ct:'+ID,group:opts.group,max_relocate:opts.max_relocate,max_restart:opts.max_restart,state:opts.state})
  }

  async poolPIDPromise(node,PID,interval=1000){
    return new Promise(async(acc,rej)=>{
      const lcl = (async ()=>{
        var status = await this.getTaskStatus(node, PID)
        //console.log(status)
        if (status.status == 'stopped') {
          if (status.exitstatus == "OK"){
            acc(status)
          }
          else
            rej(status)
        }
        else
          setTimeout(lcl,interval);
      });
      lcl()
    })
  }

}

module.exports = _iKuai
