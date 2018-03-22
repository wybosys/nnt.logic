import {Base, HttpContentType, HttpMethod, IResponseData, RequestParams} from "../../../session/model";
import {input, integer, model, output, string} from "../../../core/proto";
import {logger} from "../../../core/logger";
import {colboolean, colinteger, colstring, table} from "../../../store/proto";
import {IndexedObject} from "../../../core/kernel";

const DEVELOP_VERIFY_URL = "https://sandbox.itunes.apple.com/verifyReceipt";
const PRODU_VERIFY_URL = "https://buy.itunes.apple.com/verifyReceipt";

@model()
@table("", "apple_iap_payresults")
export class IapReceiptValidate extends Base {

    constructor() {
        super();
        this.method = HttpMethod.POST;
        this.requestType = HttpContentType.JSON;
        this.responseType = HttpContentType.JSON;
    }

    @colboolean()
    sandbox: boolean;

    requestUrl(): string {
        return this.sandbox ? DEVELOP_VERIFY_URL : PRODU_VERIFY_URL;
    }

    requestParams(): RequestParams {
        let rp = new RequestParams();
        rp.fields = {
            "receipt-data": this.receipt
        }
        return rp;
    }

    @string(1, [input], "凭据数据")
    @colstring()
    receipt: string;

    parseData(resp: IResponseData, suc: () => void, error: (err: Error) => void) {
        let data = resp.data;
        if (data.status != 0) {
            resp.code = -data.status;
            resp.data = null;
            logger.warn("苹果支付失败：" + data.status);
        }
        else {
            resp.code = 0;
            let tmp: IndexedObject = {};
            for (let k in data.receipt) {
                if (k == "in_app") {
                    let inapp = data.receipt.in_app[0];
                    for (let k in inapp)
                        tmp[k] = inapp[k];
                }
                else {
                    tmp[k] = data.receipt[k];
                }
            }
            resp.data = tmp;
            /*
            {"status":0, "environment":"Sandbox",
"receipt":{"receipt_type":"ProductionSandbox", "adam_id":0, "app_item_id":0, "bundle_id":"com.partyh5", "application_version":"0.2.8", "download_id":0, "version_external_identifier":0, "receipt_creation_date":"2018-01-06 09:16:08 Etc/GMT", "receipt_creation_date_ms":"1515230168000", "receipt_creation_date_pst":"2018-01-06 01:16:08 America/Los_Angeles", "request_date":"2018-01-06 09:26:03 Etc/GMT", "request_date_ms":"1515230763642", "request_date_pst":"2018-01-06 01:26:03 America/Los_Angeles", "original_purchase_date":"2013-08-01 07:00:00 Etc/GMT", "original_purchase_date_ms":"1375340400000", "original_purchase_date_pst":"2013-08-01 00:00:00 America/Los_Angeles", "original_application_version":"1.0",
"in_app":[
{"quantity":"1", "product_id":"com.partyh5_1", "transaction_id":"1000000364362435", "original_transaction_id":"1000000364362435", "purchase_date":"2018-01-06 09:16:08 Etc/GMT", "purchase_date_ms":"1515230168000", "purchase_date_pst":"2018-01-06 01:16:08 America/Los_Angeles", "original_purchase_date":"2018-01-06 09:16:08 Etc/GMT", "original_purchase_date_ms":"1515230168000", "original_purchase_date_pst":"2018-01-06 01:16:08 America/Los_Angeles", "is_trial_period":"false"}]}}
             */
        }
        super.parseData(resp, suc, error);
    }

    @string(2, [output], "This corresponds to the value of CFBundleIdentifier in the Info.plist file. Use this value to validate if the receipt was indeed generated for your app")
    @colstring()
    bundle_id: string;

    @string(3, [output], "This corresponds to the value of CFBundleVersion (in iOS) or CFBundleShortVersionString (in macOS) in the Info.plist")
    @colstring()
    application_version: string;

    @string(4, [output], "This corresponds to the value of CFBundleVersion (in iOS) or CFBundleShortVersionString (in macOS) in the Info.plist file when the purchase was originally made. In the sandbox environment, the value of this field is always “1.0”")
    @colstring()
    original_application_version: string;

    @string(5, [output], "When validating a receipt, use this date to validate the receipt’s signature")
    @colstring()
    creation_date: string;

    @string(6, [output], "This key is present only for apps purchased through the Volume Purchase Program. If this key is not present, the receipt does not expire. When validating a receipt, compare this date to the current date to determine whether the receipt is expired. Do not try to use this date to calculate any other information, such as the time remaining before expiration")
    @colstring()
    expiration_date: string;

    @integer(7, [output], "This value corresponds to the quantity property of the SKPayment object stored in the transaction’s payment property")
    @colinteger()
    quantity: number;

    @string(8, [output], "This value corresponds to the productIdentifier property of the SKPayment object stored in the transaction’s payment property")
    @colstring()
    product_id: string;

    @string(9, [output], "This value corresponds to the transaction’s transactionIdentifier property")
    @colstring()
    transaction_id: string;

    @string(10, [output], "For a transaction that restores a previous transaction, the transaction identifier of the original transaction. Otherwise, identical to the transaction identifier")
    @colstring()
    original_transaction_id: string;

    @string(11, [output], "The date and time that the item was purchased")
    @colstring()
    purchase_date: string;

    @string(12, [output], "For a transaction that restores a previous transaction, the date of the original transaction")
    @colstring()
    original_purchase_date: string;

    @string(20, [output])
    @colstring()
    app_item_id: string;

    @string(99, [input], "订单号")
    @colstring()
    orderid: string;
}