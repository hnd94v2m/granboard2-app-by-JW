// src/global.d.ts

type RequestDeviceOptions = {
  filters?: {
    services?: Array<number | string>;
    name?: string;
    namePrefix?: string;
    manufacturerData?: DataView;
  }[];
  optionalServices?: Array<number | string>;
  acceptAllDevices?: boolean;
};

interface Navigator {
  bluetooth?: Bluetooth;
}
interface Bluetooth {
  requestDevice(options: RequestDeviceOptions): Promise<BluetoothDevice>;
}
interface BluetoothDevice {
  gatt?: BluetoothRemoteGATTServer;
}
interface BluetoothRemoteGATTServer {
  connect(): Promise<BluetoothRemoteGATTServer>;
  connected: boolean;
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
}
interface BluetoothRemoteGATTService {
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}
interface BluetoothRemoteGATTCharacteristic {
  properties: { notify?: boolean };
  startNotifications(): Promise<void>;
  addEventListener(type: string, listener: (event: Event) => void): void;
  value?: DataView;
}
