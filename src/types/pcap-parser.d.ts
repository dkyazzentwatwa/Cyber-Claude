declare module 'pcap-parser' {
  import { EventEmitter } from 'events';

  interface PcapPacket {
    header: {
      timestampSeconds: number;
      timestampMicroseconds: number;
      originalLength: number;
      captureLength: number;
    };
    data: Buffer;
  }

  interface PcapGlobalHeader {
    magicNumber: number;
    versionMajor: number;
    versionMinor: number;
    gmtOffset: number;
    timestampAccuracy: number;
    snapshotLength: number;
    linkLayerType: number;
  }

  interface PcapParser extends EventEmitter {
    on(event: 'globalHeader', listener: (header: PcapGlobalHeader) => void): this;
    on(event: 'packet', listener: (packet: PcapPacket) => void): this;
    on(event: 'end', listener: () => void): this;
    on(event: 'error', listener: (err: Error) => void): this;
  }

  export function parse(filePath: string): PcapParser;
}