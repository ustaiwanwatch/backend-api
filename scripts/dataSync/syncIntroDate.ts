import { CongressGovIntroDateParser } from '../../libs/congressGov/CongressGovIntroDateParser';
import * as dbLib from '../../libs/dbLib';
import { CongressGovHelper } from '../../libs/congressGov/CongressGovHelper';
import * as _ from 'lodash';
import { CongressGovTextUpdater } from '../../libs/congressGov/CongressGovTextUpdater';
import * as mongoDbLib from '../../libs/mongodbLib';
import { MongoDbConfig } from '../../config/mongodb';

export class IntroducedDateSync {
  public  readonly updater = new CongressGovTextUpdater();
  private tbl: mongoDbLib.BillTable;

  private readonly congressGovIntroDateParser = new CongressGovIntroDateParser();

  public async init (): Promise<void> {
    if (!this.tbl) {
      let db = await mongoDbLib.MongoDBManager.instance;
      const tblName = MongoDbConfig.tableNames.BILLS_TABLE_NAME;
      this.tbl = db.getTable(tblName);
    }
    return Promise.resolve();
  }

  public async syncIntroducedDateForAllBills (currentCongress: number, minUpdateCongress?: number, maxUpdateCongress?: number) {
    const minCongress = Math.max(minUpdateCongress || CongressGovHelper.MIN_CONGRESS_DATA_AVAILABLE,
                                 CongressGovHelper.MIN_CONGRESS_DATA_AVAILABLE);
    const maxCongress = Math.min(maxUpdateCongress || currentCongress,
                                 currentCongress);

    console.log(`minCongress = ${minCongress} \t maxCongress = ${maxCongress}`);

    let bills = await this.tbl.getAllBills('id', 'congress', 'billType', 'billNumber');
    bills = _.filter(bills, x => x.congress >= minCongress && x.congress <= maxCongress);

    // build congress <--> bills map
    const congressBillsMap = _.groupBy(bills, 'congress');
    const keys = _.keys(congressBillsMap);
    for (let c = 0; c < keys.length; ++c) {
      let congress = parseInt(keys[c]);
      let bills = congressBillsMap[congress];
      console.log(`Updating congress = ${congress}`);
      await this.batchSyncForCongress(congress, bills, currentCongress);
      console.log('\n\n\n');
    }
  }

  public async batchSyncForCongress (congress: number, bills: dbLib.BillEntity[], currentCongress: number) {
    for (let i = 0; i < bills.length; ++i) {
      const bill = bills[i];
      const path = CongressGovHelper.generateCongressGovBillPath(bill.congress, bill.billType.code, bill.billNumber);
      const billDisplay = dbLib.DbHelper.displayBill(bill);

      console.log(`\n${billDisplay} -- Updating introduced date --\n`);

      const introDate = await this.congressGovIntroDateParser.getIntroducedDate(path);
      if (introDate) {
        await this.tbl.updateIntroducedDate(bill.id, introDate);
      } else {
        console.log(`parsing failed\n`);
      }
    }
  }
}

let sync = new IntroducedDateSync();
sync.init()
  .then(() => sync.syncIntroducedDateForAllBills(CongressGovHelper.CURRENT_CONGRESS));