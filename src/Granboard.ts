import { CreateSegment, Segment, SegmentID } from "./DartboardUtilities";

// ---- 你不需 declare global、type/interface，全部已經到 global.d.ts 預編譯 ----

// 藍牙 UUID
const GRANBOARD_UUID = "442f1570-8a00-9a28-cbe1-e1d4212d53eb";

// 完整 SEGMENT_MAPPING（此為範例，請補齊所有對應）
const SEGMENT_MAPPING: Record<string, SegmentID> = {
  "50-46-51-64": SegmentID.INNER_1,
  "50-46-52-64": SegmentID.TRP_1,
  "50-46-53-64": SegmentID.OUTER_1,
  "50-46-54-64": SegmentID.DBL_1,
  "57-46-49-64": SegmentID.INNER_2,
  "57-46-48-64": SegmentID.TRP_2,
  "57-46-50-64": SegmentID.OUTER_2,
  "56-46-50-64": SegmentID.DBL_2,
  "55-46-49-64": SegmentID.INNER_3,
  "55-46-48-64": SegmentID.TRP_3,
  "55-46-50-64": SegmentID.OUTER_3,
  "56-46-52-64": SegmentID.DBL_3,
  "48-46-49-64": SegmentID.INNER_4,
  "48-46-51-64": SegmentID.TRP_4,
  "48-46-53-64": SegmentID.OUTER_4,
  "48-46-54-64": SegmentID.DBL_4,
  "53-46-49-64": SegmentID.INNER_5,
  "53-46-50-64": SegmentID.TRP_5,
  "53-46-52-64": SegmentID.OUTER_5,
  "52-46-54-64": SegmentID.DBL_5,
  "49-46-48-64": SegmentID.INNER_6,
  "49-46-49-64": SegmentID.TRP_6,
  "49-46-51-64": SegmentID.OUTER_6,
  "52-46-52-64": SegmentID.DBL_6,
  "49-49-46-49-64": SegmentID.INNER_7,
  "49-49-46-50-64": SegmentID.TRP_7,
  "49-49-46-52-64": SegmentID.OUTER_7,
  "56-46-54-64": SegmentID.DBL_7,
  "54-46-50-64": SegmentID.INNER_8,
  "54-46-52-64": SegmentID.TRP_8,
  "54-46-53-64": SegmentID.OUTER_8,
  "54-46-54-64": SegmentID.DBL_8,
  "57-46-51-64": SegmentID.INNER_9,
  "57-46-52-64": SegmentID.TRP_9,
  "57-46-53-64": SegmentID.OUTER_9,
  "57-46-54-64": SegmentID.DBL_9,
  "50-46-48-64": SegmentID.INNER_10,
  "50-46-49-64": SegmentID.TRP_10,
  "50-46-50-64": SegmentID.OUTER_10,
  "52-46-51-64": SegmentID.DBL_10,
  "55-46-51-64": SegmentID.INNER_11,
  "55-46-52-64": SegmentID.TRP_11,
  "55-46-53-64": SegmentID.OUTER_11,
  "55-46-54-64": SegmentID.DBL_11,
  "53-46-48-64": SegmentID.INNER_12,
  "53-46-51-64": SegmentID.TRP_12,
  "53-46-53-64": SegmentID.OUTER_12,
  "53-46-54-64": SegmentID.DBL_12,
  "48-46-48-64": SegmentID.INNER_13,
  "48-46-50-64": SegmentID.TRP_13,
  "48-46-52-64": SegmentID.OUTER_13,
  "52-46-53-64": SegmentID.DBL_13,
  "49-48-46-51-64": SegmentID.INNER_14,
  "49-48-46-52-64": SegmentID.TRP_14,
  "49-48-46-53-64": SegmentID.OUTER_14,
  "49-48-46-54-64": SegmentID.DBL_14,
  "51-46-48-64": SegmentID.INNER_15,
  "51-46-49-64": SegmentID.TRP_15,
  "51-46-50-64": SegmentID.OUTER_15,
  "52-46-50-64": SegmentID.DBL_15,
  "49-49-46-48-64": SegmentID.INNER_16,
  "49-49-46-51-64": SegmentID.TRP_16,
  "49-49-46-53-64": SegmentID.OUTER_16,
  "49-49-46-54-64": SegmentID.DBL_16,
  "49-48-46-49-64": SegmentID.INNER_17,
  "49-48-46-48-64": SegmentID.TRP_17,
  "49-48-46-50-64": SegmentID.OUTER_17,
  "56-46-51-64": SegmentID.DBL_17,
  "49-46-50-64": SegmentID.INNER_18,
  "49-46-52-64": SegmentID.TRP_18,
  "49-46-53-64": SegmentID.OUTER_18,
  "49-46-54-64": SegmentID.DBL_18,
  "54-46-49-64": SegmentID.INNER_19,
  "54-46-48-64": SegmentID.TRP_19,
  "54-46-51-64": SegmentID.OUTER_19,
  "56-46-53-64": SegmentID.DBL_19,
  "51-46-51-64": SegmentID.INNER_20,
  "51-46-52-64": SegmentID.TRP_20,
  "51-46-53-64": SegmentID.OUTER_20,
  "51-46-54-64": SegmentID.DBL_20,
  "56-46-48-64": SegmentID.BULL,
  "52-46-48-64": SegmentID.DBL_BULL,
  "66-84-78-64": SegmentID.RESET_BUTTON,
  // ...請補齊
};

export class Granboard {
  private bluetoothConnection: BluetoothRemoteGATTCharacteristic;
  public segmentHitCallback?: (segment: Segment) => void;

  public static async ConnectToBoard(): Promise<Granboard> {
    if (!navigator.bluetooth) {
      throw new Error("本瀏覽器不支援 Web Bluetooth。");
    }
    const boardBluetooth = await navigator.bluetooth.requestDevice({
      filters: [{ services: [GRANBOARD_UUID] }]
    });
    if (!boardBluetooth.gatt) {
      throw new Error("無法找到 dartboard GATT service");
    }
    if (!boardBluetooth.gatt.connected) {
      await boardBluetooth.gatt.connect();
    }
    const service = await boardBluetooth.gatt.getPrimaryService(GRANBOARD_UUID);
    const characteristics = await service.getCharacteristics();
    const boardCharacteristic = characteristics.find(
      (characteristic: any) => characteristic.properties.notify
    );
    if (!boardCharacteristic) {
      throw new Error("無法找到支援 notify characteristic");
    }
    const board = new Granboard(boardCharacteristic as BluetoothRemoteGATTCharacteristic);
    await boardCharacteristic.startNotifications();
    return board;
  }

  constructor(char: BluetoothRemoteGATTCharacteristic) {
    this.bluetoothConnection = char;
    this.bluetoothConnection.addEventListener(
      "characteristicvaluechanged",
      this.onSegmentHit.bind(this)
    );
  }

  private onSegmentHit() {
    if (!this.bluetoothConnection.value) return;
    const segmentUID = Array.from(new Uint8Array(this.bluetoothConnection.value.buffer)).join("-");
    const segmentID = SEGMENT_MAPPING[segmentUID];
    if (segmentID !== undefined) {
      this.segmentHitCallback?.(CreateSegment(segmentID));
    }
  }
}
