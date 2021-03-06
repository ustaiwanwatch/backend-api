import * as _ from 'lodash';
import { RequestHandlerBase } from './RequestHandlerBase';
import { RequestParams } from './RequestParams';
import { IFields } from '../../../libs/dbLib2';

export class CongressRolesFieldProcessor<T> extends RequestHandlerBase<T> {
  protected async preProcess (params: RequestParams): Promise<boolean> {
    let fieldValues = params.get('field');
    if (!fieldValues) {
      return false;
    }
    return fieldValues.processContext('congressRoles', this._getFilter);
  }

  protected _getFilter (rawContext: string[]): IFields[keyof IFields] {
    if (rawContext.length < 1) {
      return true;
    }
    let param: string = _.head(rawContext);
    if (param === 'latest') {
      return [0];
    }

    let roleTime: number;
    if (param === 'current') {
      roleTime = _.now();
    } else {
      roleTime = _.parseInt(param);
      if (_.isNaN(roleTime)) {
        return true;
      }
    }

    return {
      startDate: { _op: '<=', _val: roleTime },
      endDate: { _op: '>', _val: roleTime },
    };
  }

  public async postProcess (_p: RequestParams, results: T[]): Promise<T[]> {
    return results;
  }
}
