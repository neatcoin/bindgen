{
  inputs.nixpkgs.url = "github.com:nixos/nixpkgs/nixos-21.11";

  outputs = { self, nixpkgs }: {
    packages."x86_64-linux"."neatcoin-bindgen" = let
      pkgs = nixpkgs.legacyPackages."x86_64-linux";
    in with pkgs; yarn2nix-moretea.mkYarnWorkspace {
      name = "neatcoin-bindgen-0.1.0";
      src = ./.;
      packageJSON = ./package.json;
      yarnLock = ./yarn.lock;
      packageOverrides = {
        neatcoin-bindgen = {
          buildPhase = ''
            yarn run build
          '';
        };
      }
    };
  };
}