import * as aws from 'aws-sdk'

export class MongoDbConfig {
  public static readonly tableNames = {
    'VOLUNTEER_BILLCATEGORIES_TABLE_NAME': 'volunteer.billCategories'
  }

  private static _remoteUrl: string

  public static get localUrl (): Promise<string> {
    return Promise.resolve(`mongodb://localhost:27017/congress`)
  }

  public static get remoteUrl (): Promise<string> {
    if (MongoDbConfig._remoteUrl) {
      return Promise.resolve(MongoDbConfig._remoteUrl)
    } else {
      return MongoDbConfig.getKeyFileFromS3().then(json => {
        MongoDbConfig._remoteUrl = `mongodb://${json.admin_user}:${json.admin_pass}@${json.host}:${json.port}/congress?ssl=true&replicaSet=globaldb`
        return MongoDbConfig._remoteUrl
      })
    }
  }

  private static getKeyFileFromS3 (): Promise<any> {
    return new Promise((resolve, reject) => {
      let s3 = new aws.S3()
      var params = {
        Bucket: 'taiwanwatch-credentials',
        Key: 'azure_mongodb.json'
       }
      console.log(`[MongoDbConfig::getKeyFileFromS3()] requesting S3`)
      s3.getObject(params, (err, data) => {
        if (err) {
          console.log(`[MongoDbConfig::getKeyFileFromS3()] Error = ${JSON.stringify(err, null, 2)}`)
          reject(err)
        } else {
          console.log(`[MongoDbConfig::getKeyFileFromS3()] OK. data = ${JSON.stringify(data, null, 2)}`)
          try {
            let json = JSON.parse(data.Body.toString())
            console.log(`[MongoDbConfig::getKeyFileFromS3()] JSON parse done`)
            resolve(json)
          } catch (e) {
            console.log(`[MongoDbConfig::getKeyFileFromS3()] JSON parse failed. Error = ${e}`)
            reject(e)
          }
        }
      })
    })
  }
}
