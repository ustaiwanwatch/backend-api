import * as _ from 'lodash';
import * as assert from 'assert';
import * as airtable from 'airtable';
import * as aws from 'aws-sdk';

import { Entity, EntityType, SCHEMAS } from './';

class Cache {
  protected _storage: { [type: string]: { [id: string]: Entity } } = {};

  public put (type: EntityType, id: string, entity: Entity): void {
    if (!(type in this._storage)) {
      this._storage[type] = {};
    }
    this._storage[type][id] = entity;
  }

  public get (type: EntityType, id: string): Entity {
    if (!(type in this._storage)) {
      return;
    }
    if (!(id in this._storage[type])) {
      return;
    }
    return this._storage[type][id];
  }

  public delete (type: EntityType, id: string): void {
    if (!(type in this._storage)) {
      return;
    }
    if (!(id in this._storage[type])) {
      return;
    }
    delete this._storage[type][id];
  }

  public printKeys (): void {
    _.each(this._storage, (v, type) =>
      _.each(v, (_entry, id) => {
        console.log(type + ' ' + id);
      })
    );
  }
}

export class Manager {
  protected _db: any;
  protected _cache: Cache;

  protected constructor (apiKey: string, dbId: string) {
    this._db = new airtable({ apiKey: apiKey }).base(dbId);
    this._cache = new Cache();
    this._assertDb();
  }

  public static async new (dbId: string): Promise<Manager> {
    console.log(`[Airtable.Manager.new()] ${dbId}`);
    let apiKey = await this.getApiKey();
    let instance = new Manager(apiKey, dbId);
    await instance._prefetch();
    return instance;
  }

  protected async _prefetch (): Promise<void> {
    await Promise.all(
      _.map(SCHEMAS, async (schema, type: EntityType) => {
        if (schema.prefetch) {
          try {
            await this.list(type);
          } catch (e) {
            console.log(`[Airtable.Manager.prefetch()] ${type}: failed `
              + `but should be ok. ${e}`);
          }
        }
      }),
    );
  }

  protected _assertDb (): void {
    assert.ok(this._db, '[Airtable] Could not connect to database');
  }

  // Read a list of entities from remote db
  public async list (
    type: EntityType,
    fields?: string[],
    formula?: string,
    limit?: number,
  ): Promise<Entity[]> {
    let options: any = {};
    if (fields) {
      fields = _.filter(fields, v => v in SCHEMAS[type].fields);
      options.fields = fields;
    } else {
      options.fields = Object.keys(SCHEMAS[type].fields);
    }
    if (formula) {
      options.filterByFormula = formula;
    }
    if (limit) {
      options.maxRecords = limit;
    }

    // read raw records
    let data = await new Promise<any[]>(
      async (resolve, reject) => {
        console.log(`[Airtable.Manager.list()] ${type}`);
        this._assertDb();
        let results: any[] = [];

        this._db(SCHEMAS[type].table).select(options).eachPage(
          (records, fetchNextPage) => {
            results = results.concat(records);
            fetchNextPage();
          },
          (err) => {
            if (err) {
              reject(err);
            }
            resolve(results);
          }
        );
      }
    );
    if (!data) {
      return;
    }
    // resolve referenced entities
    console.log(`[Airtable.Manager.list()] ${type}: resolving references`);
    let entities = await Promise.all(_.map(data, async d =>
      await Entity._new(this, type, d.id, d.fields),
    ));
    // cache
    console.log(`[Airtable.Manager.list()] ${type}: caching`);
    _.each(entities, entity => {
      this._cache.put(type, entity.id, entity);
    });

    return entities;
  }

  public async find (type: EntityType, id: string): Promise<Entity> {
    let cached = this._cache.get(type, id);
    if (cached) {
      return cached;
    }
    let data = await new Promise<any>(
      async (resolve, reject) => {
        this._assertDb();
        console.log(`[Airtable.Manager.find() remote] ${type}: ${id}`);
        this._db(SCHEMAS[type].table).find(id, (err, record) => {
          if (err) {
            reject(err);
          }
          resolve(record);
        });
      }
    );
    if (!data) {
      return;
    }
    let entity = await Entity._new(this, type, data.id, data.fields);
    this._cache.put(type, id, entity);

    return entity;
  }

  public async create (type: EntityType): Promise<Entity> {
    console.log(`[Airtable.Manager.create()] ${type}`);
    let data = await new Promise<Entity>((resolve, reject) => {
      this._assertDb();
      this._db(SCHEMAS[type].table).create({}, (err, record) => {
        if (err) {
          reject(err);
        }
        resolve(record);
      });
    });
    if (!data) {
      return;
    }
    let entity = await Entity._new(this, type, data.id, {});
    this._cache.put(type, entity.id, entity);

    return entity;
  }

  public async update (entity: Entity, fields?: string[]): Promise<void> {
    console.log(`[Airtable.Manager.update()] ${entity.type}`);
    let id = entity.id;
    if (fields) {
      fields = _.filter(fields, field => field in entity.schema.fields);
    } else {
      fields = entity.getExistingFields();
    }
    let data = _.reduce(fields, (result, field) => {
      let type = entity.schema.fields[field];
      let value = entity.get(field);
      if (type) {
        result[field] = _.map(<Entity[]>value, e => e.id);
      } else {
        result[field] = entity.get(field);
      }
      return result;
    }, {});

    return new Promise<void>((resolve, reject) => {
      this._assertDb();
      this._db(entity.schema.table).update(id, data, (err, record) => {
        if (err) {
          reject(err);
        }
        resolve();
      });
    });
  }

  public async delete (entity: Entity): Promise<void> {
    console.log(`[Airtable.Manager.delete()] ${entity.type}`);
    return new Promise<void>((resolve, reject) => {
      this._assertDb();
      this._db(entity.schema.table)
        .destroy(entity.id, (err, _record) => {
          if (err) {
            reject(err);
          }
          this._cache.delete(entity.type, entity.id);
          resolve();
        }
      );
    });
  }

  public _printCache () {
    this._cache.printKeys();
  }

  private static async getApiKey (): Promise<any> {
    let s3 = new aws.S3();
    let params = {
      Bucket: 'taiwanwatch-credentials',
      Key: 'airtable.json',
    };
    return new Promise((resolve, reject) => {
      s3.getObject(params, (err, data) => {
        if (err) {
          console.error(err);
          reject(err);
        }
        try {
          let parsed = JSON.parse(data.Body.toString());
          resolve(parsed['apiKey']);
        } catch (e) {
          console.error(e);
          reject(e);
        }
      });
    });
  }
}
