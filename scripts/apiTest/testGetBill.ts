import * as dbLib from '../../libs/dbLib/DynamoDBManager'
import * as _ from 'lodash'
import * as api from '../../functions/private/billManagement/billHandler'

let test = async (req: api.QueryBillsRequest = {}) => {
  let billApi = new api.BillApi()
  let out = await billApi.queryBills(req)
  console.log(`out = ${JSON.stringify(out, null, 2)}`)
}

// test({
//   flushOut: true,
//   congress: 115,
//   attrNamesToGet: ['id', 'billType', 'billNumber', 'congress']
// })

// test({congress: [115], categoryIdx: ['9a6cb046-2f66-4d4b-8148-10b57793341b']})
// test()
// test({congress: [115], categoryIdx: ['9a6cb046-2f66-4d4b-8148-10b57793341b']})
test({sponsorRoleId: ['39c0a42a-120f-4e72-861e-b2a3552c9316']}
)
// let test2 = async () => {
//   let billApi = new api.BillApi()
//   let out = await billApi.getBillById({
//     // id: ['cbb2f2e2-db6a-433f-b5a2-50ad5b3a81e2', '573ce7bd-3765-4df8-be4b-3307c9ef9958']
//     id: ['12bd743c-83f4-4e7c-9558-c54081a3ca01',
//          '70ff97c5-de57-410b-83c8-30be19b650df',
//          'dc48f5ca-2622-4d1e-af31-51015aae7eb5',
//          '3db6e363-cabd-4802-8955-63e786b6fc30',
//          '8dd53af3-97a0-442a-9365-7bdd36bfe32d'],
//     attrNamesToGet: ['congress', 'cosponsors']
//   })
//   console.log(JSON.stringify(out, null, 2))
// }

// test2()
