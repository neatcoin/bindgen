{
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixos-21.11";
  };

  outputs = { self, nixpkgs, ... }: {
    packages."x86_64-linux"."neatcoin-bindgen" = let
      pkgs = nixpkgs.legacyPackages."x86_64-linux";
    in with pkgs; yarn2nix-moretea.mkYarnPackage {
      name = "neatcoin-bindgen-0.1.0";
      src = ./.;
      packageJSON = ./package.json;
      yarnLock = ./yarn.lock;
      buildPhase = ''
        yarn run build
        echo -e "#!/usr/bin/env node\n$(cat ./deps/@neatcoin/bindgen/dist/index.js)" > ./deps/@neatcoin/bindgen/dist/index.js 
        chmod +x ./deps/@neatcoin/bindgen/dist/index.js
      '';
    };
  };
}