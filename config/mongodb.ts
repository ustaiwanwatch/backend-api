import * as aws from 'aws-sdk'
import { debug } from './debug'

export class MongoDbConfig {
  public static readonly tableNames = {
    'BILLCATEGORIES_TABLE_NAME': 'volunteer.billCategories',
    'BILLS_TABLE_NAME': 'volunteer.bills',
    'BILLTYPES_TABLE_NAME': 'volunteer.billTypes',
    'BILLVERSIONS_TABLE_NAME': 'volunteer.billVersions',
    'PERSON_TABLE_NAME': 'volunteer.persons',
    'ROLES_TABLE_NAME': 'volunteer.roles',
    'TAGS_TABLE_NAME': 'volunteer.tags',
    'TAGS_META_TABLE_NAME': 'volunteer.tags.meta',
    'CONGRESSGOV_SYNC_BILL_TABLE_NAME': 'congressgov.sync.bill',
    'ARTICLE_SNIPPETS_TABLE_NAME': 'site.articleSnippets',
  }

  private static _remoteUrl: string

  public static get connectionUrl (): Promise<string> {
    // return MongoDbConfig.localUrl
    return MongoDbConfig.remoteUrl
  }

  public static get localUrl (): Promise<string> {
    return Promise.resolve(`mongodb://localhost:27017/congress`)
  }

  public static get remoteUrl (): Promise<string> {
    if (debug && Array.isArray(debug['mongodb']['congress'])) {
      return Promise.resolve(debug['mongodb']['congress'][0]);
    }
    if (MongoDbConfig._remoteUrl) {
      return Promise.resolve(MongoDbConfig._remoteUrl)
    } else {
      return MongoDbConfig.getKeyFileFromS3().then(json => {
        MongoDbConfig._remoteUrl = `mongodb://${json.admin_user}:${json.admin_pass}@${json.host}:${json.port}/congress?ssl=true&replicaSet=globaldb`
        return MongoDbConfig._remoteUrl
      })
    }
  }

  // --------------------------------------------------

  private static async getKeyFileFromS3 (): Promise<any> {
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
          console.log(`[MongoDbConfig::getKeyFileFromS3()] OK. data = ` +
            `${JSON.stringify(
              data,
              (key, val) => key === 'Body' ? '<omitted>' : val,
              2
            )}`
          );
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

  public static async getUrl (): Promise<string> {
    if (debug && Array.isArray(debug['mongodb']['urls'])) {
      return debug['mongodb']['urls'][0];
    }
    let s3Credential = await MongoDbConfig.getKeyFileFromS3();
    return s3Credential.url;
  }
}