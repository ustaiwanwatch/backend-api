import { Context, Callback, APIGatewayEvent } from 'aws-lambda'
import { TrackerSync } from '../../../scripts/dataSync/syncTrackers'
import { CongressGovHelper } from '../../../libs/congressGov/CongressGovHelper';
import Response from '../../../libs/utils/Response'
import { AllInfoSync } from '../../../scripts/dataSync/syncAllInfo';

class DailySyncHandler {
  public static handleRequest (event: any, context: Context, callback?: Callback) {
    console.log(`[DailySyncHandler::handleRequest()] Start.`)
    console.log(`[DailySyncHandler::handleRequest()] Event = ${JSON.stringify(event, null, 2)}`)
    console.log(`[DailySyncHandler::handleRequest()] Context = ${JSON.stringify(context, null, 2)}`)

    // This freezes node event loop when callback is invoked
    context.callbackWaitsForEmptyEventLoop = false;

    let promises = []
    promises.push(DailySyncHandler.syncTrackers())
    promises.push(DailySyncHandler.syncAllInfo())

    Promise.all(promises).then(out => {
      let err = out[0] || out[1]
      if (!err) {
        console.log(`[DailySyncHandler::handleRequest()] Done`)
        callback && Response.success(callback, '', true)
      } else {
        console.log(`[DailySyncHandler::handleRequest()] Failed. Error = ${JSON.stringify(err, null, 2)}`)
        callback && Response.error(callback, JSON.stringify(err, null, 2), true)
      }
    })
  }

  private static syncTrackers (): Promise<void> {
    return new Promise((resolve, reject) => {
      let sync = new TrackerSync()
      sync.init()
        .then(() => sync.syncTrackersForAllBills(CongressGovHelper.CURRENT_CONGRESS))
        .then(() => {
          console.log(`[DailySyncHandler::syncTrackers()] Done`)
          resolve()
        })
        .catch(err => {
          console.log(`[DailySyncHandler::syncTrackers()] Failed. Error = ${JSON.stringify(err, null, 2)}`)
          resolve(err)
        })
    })
  }

  private static syncAllInfo (): Promise<void> {
    return new Promise((resolve, reject) => {
      let sync = new AllInfoSync()
      let currentCongress = CongressGovHelper.CURRENT_CONGRESS
      sync.init()
        .then(() => sync.syncAllInfoForAllBills(currentCongress, currentCongress, currentCongress))
        .then(() => {
          console.log(`[DailySyncHandler::syncAllInfo()] Done`)
          resolve()
        }).catch((err) => {
          console.log(`[DailySyncHandler::syncAllInfo()] Failed. Error = ${JSON.stringify(err, null, 2)}`)
          resolve(err)
        })
    })
  }
}

export let main = DailySyncHandler.handleRequest
