// SPDX-License-Identifier: GPL-3.0-or-later
// This file is part of Neatcoin.
//
// Copyright (c) 2021 Wei Tang.
//
// Neatcoin is free software: you can redistribute it and/or modify
// it under the terms of the GNU General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// Neatcoin is distributed in the hope that it will be useful,
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU General Public License for more details.
//
// You should have received a copy of the GNU General Public License
// along with Neatcoin. If not, see <http://www.gnu.org/licenses/>.

import path from "path";
import { mkdir, writeFile } from "fs/promises";
import type { Option } from "@polkadot/types";
import { ApiPromise, WsProvider } from "@polkadot/api";

function hexToName (hex: string): string {
  let ret = '';

  for (let c = 2; c < hex.length; c += 2) {
    ret += String.fromCharCode(parseInt(hex.substr(c, 2), 16));
  }

  return ret;
}

function nameToString (name: any): string {
  let ret = '';

  for (let i = 0; i < name.length; i++) {
    if (ret === '') {
      ret = hexToName(name[i].toString());
    } else {
      ret = hexToName(name[i].toString()) + '.' + ret;
    }
  }

  if (ret === '') {
    return '[root]';
  } else {
    return ret;
  }
}

function nameToTLDString (name: any): string {
  return hexToName(name[0].toString());
}

function intToIpv4 (int: number): string {
  const part1 = int & 255;
  const part2 = (int >> 8) & 255;
  const part3 = (int >> 16) & 255;
  const part4 = (int >> 24) & 255;

  return [part4, part3, part2, part1].join(".");
}

export async function run() {
  console.log("Neatcoin bindgen");

  const destination = process.env.DESTINATION;
  if (!destination) {
    throw new Error("DESTINATION is not defined.");
  }

  const provider = new WsProvider("wss://vodka.rpc.neatcoin.org/ws");
  const api = await ApiPromise.create({ provider });

  console.log(`Genesis hash: ${api.genesisHash.toHex()}`);

  let namedFile = "";
  const zoneFiles: Record<string, string[]> = {};

  const ICANNs = await api.query.zone.iCANNs.entries();
  for (const itemRaw of ICANNs) {
    const item = (itemRaw[1] as Option<any>).unwrap();
    const tld = nameToString(item[0]);

    namedFile += `\nzone "${tld}" { type forward; forwarders { 8.8.8.8; 8.8.4.4; 1.1.1.1; }; };`;
  }

  const CNAMEs = await api.query.zone.cNAMEs.entries();
  const declaredCNAMEs = [];
  for (const itemRaw of CNAMEs) {
    const item = (itemRaw[1] as Option<any>).unwrap();
    const domain = nameToString(item[0]);
    const cname = nameToString(item[1]);
    const tld = nameToTLDString(item[0]);

    zoneFiles[tld] ||= [];
    zoneFiles[tld].push(`${domain}. IN CNAME ${cname}.`);

    declaredCNAMEs.push(domain);
  }

  const As = await api.query.zone.as.entries();
  for (const itemRaw of As) {
    const item = (itemRaw[1] as Option<any>).unwrap();
    const domain = nameToString(item[0]);
    const ipv4Raws = item[1];
    const tld = nameToTLDString(item[0]);

    zoneFiles[tld] ||= [];
    for (const ipv4Raw of ipv4Raws) {
      const ipv4 = intToIpv4(ipv4Raw);
      zoneFiles[tld].push(`${domain}. IN A ${ipv4}`);
    }
  }

  const AAAAs = await api.query.zone.aAAAs.entries();
  for (const itemRaw of AAAAs) {
    const item = (itemRaw[1] as Option<any>).unwrap();
    const domain = item[0];
    const ipv6sRaw = item[1];

    console.error(`Not yet supported ipv6 ${domain}`);
  }

  const MXs = await api.query.zone.mXs.entries();
  for (const itemRaw of MXs) {
    const item = (itemRaw[1] as Option<any>).unwrap();
    const domain = nameToString(item[0]);
    const priority = item[1][0].toNumber();
    const mx = nameToString(item[1][1]);
    const tld = nameToTLDString(item[0]);

    zoneFiles[tld] ||= [];
    zoneFiles[tld].push(`${domain}. IN MX ${priority} ${mx}.`);
  }

  const NSs = await api.query.zone.nSs.entries();
  for (const itemRaw of NSs) {
    const item = (itemRaw[1] as Option<any>).unwrap();
    const domain = nameToString(item[0]);
    const nsRaws = item[1];
    const tld = nameToTLDString(item[0]);

    zoneFiles[tld] ||= [];
    for (const nsRaw of nsRaws) {
      const ns = nameToString(nsRaw);
      zoneFiles[tld].push(`${domain}. IN NS ${ns}.`);
    }
  }

  for (const tld of Object.keys(zoneFiles)) {
    const tldPath = path.join(destination, `${tld}.zone`);
    namedFile += `\nzone "${tld}" { type master; file "${tldPath}"; };`;
  }

  await mkdir(destination, { recursive: true });
  for (const zoneName of Object.keys(zoneFiles)) {
    const zonePath = path.join(destination, `${zoneName}.zone`);
    zoneFiles[zoneName].unshift("@ NS vodka.dns.neatcoin.org.");
    zoneFiles[zoneName].unshift("@ SOA vodka.dns.neatcoin.org. postmaster.that.world. (0 21600 3600 604800 86400)");
    await writeFile(zonePath, zoneFiles[zoneName].join("\n"));
  }

  const namedPath = path.join(destination, "named.conf");
  await writeFile(namedPath, namedFile);

  console.log("Finished generation.");
}