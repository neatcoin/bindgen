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

import type { Option } from '@polkadot/types';
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

async function run() {
  console.log("Neatcoin bindgen");

  const provider = new WsProvider("wss://vodka.rpc.neatcoin.org/ws");
  const api = await ApiPromise.create({ provider });

  console.log(`Genesis hash: ${api.genesisHash.toHex()}`);

  let namedFile = "";
  const zoneFiles = {};

  const ICANNs = await api.query.zone.iCANNs.entries();
  for (const itemRaw of ICANNs) {
    const icannName = (itemRaw[1] as Option<any>).unwrap()[0];

    namedFile += `zone "${icannName}" { type forward; forwarders { 8.8.8.8; 8.8.4.4; 1.1.1.1; }; };`;
  }

  const CNAMEs = await api.query.zone.cNAMEs.entries();
  const declaredCNAMEs = [];
  for (const itemRaw of CNAMEs) {
    const item = (itemRaw[1] as Option<any>).unwrap();
    const domain = item[0];
    const cname = item[1];

    declaredCNAMEs.push(domain);
  }

  const As = await api.query.zone.as.entries();
  for (const itemRaw of As) {
    const item = (itemRaw[1] as Option<any>).unwrap();
    const domain = item[0];
    const ipv4sRaw = item[1];
  }

  const AAAAs = await api.query.zone.aAAAs.entries();
  for (const itemRaw of AAAAs) {
    const item = (itemRaw[1] as Option<any>).unwrap();
    const domain = item[0];
    const ipv6sRaw = item[1];
  }

  const MXs = await api.query.zone.mXs.entries();
  for (const itemRaw of MXs) {
    const item = (itemRaw[1] as Option<any>).unwrap();
    const domain = item[0];
    const priority = item[1][0];
    const mx = item[1][1];
  }

  const NSs = await api.query.zone.nSs.entries();
  for (const itemRaw of NSs) {
    const item = (itemRaw[1] as Option<any>).unwrap();
    const domain = item[0];
    const nss = item[1];
  }
}

async function main() {
  await run();
  process.exit(0);
}

main().catch((error) => {
  console.error(`Returned error: ${error}. Exiting.`);
  process.exit(1);
});