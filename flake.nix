{
  description = "A Nix-flake-based Node.js development environment";

  inputs = {
    flake-utils.url = "github:numtide/flake-utils";
    nixpkgs.url = "github:NixOS/nixpkgs";
  };

  outputs =
    { self
    , flake-utils
    , nixpkgs
    }:

    flake-utils.lib.eachDefaultSystem (system:
    let
      
      nodeDependencies = (pkgs.callPackage ./default.nix {}).nodeDependencies;
      
      overlays = [
        (self: super: rec {
          nodejs = super.nodejs-18_x;
          pnpm = super.nodePackages.pnpm;
          yarn = (super.yarn.override { inherit nodejs; });
        })
      ];

      pkgs = import nixpkgs { inherit overlays system; };

      saleWatcher = pkgs.stdenv.mkDerivation {
        name = "sale-watcher";

        src = ./.;

        buildInputs = with pkgs; [ nodejs ];

        buildPhase = ''
          ln -s ${nodeDependencies}/lib/node_modules ./node_modules
          export PATH="${nodeDependencies}/bin:$PATH"
          
          mkdir -p $out/bin
          tsc
          cp -r dist $out/bin
        '';

        # installPhase = ''
        #   mkdir -p $out/bin
        #   cp -R dist/* $out/bin
        #   cp package.json $out/bin
        #   cp package-lock.json $out/bin
        #   NODE_ENV=production npm ci
        #   rm $out/bin/package.json
        #   rm $out/bin/package-lock.json
        # '';
      };
    in
    {
      devShells.default = pkgs.mkShell {
        buildInputs = with pkgs; [ node2nix nodejs pnpm yarn ];

        shellHook = ''
          echo "node `${pkgs.nodejs}/bin/node --version`"
        '';
      };

      packages.saleWatcher-docker = pkgs.dockerTools.buildImage {
        name = "sale-watcher-nix";
        tag = "latest";

        copyToRoot = pkgs.buildEnv {
          name = "image-root";
          paths = [ pkgs.nodejs saleWatcher ];
          pathsToLink = [ "/bin" ];
        };

        config = {
          Cmd = [ "node" "/bin/index.js" ];
          WorkingDir = "/app";
          Volumes = { "/app" = { }; };
        };
      };
    });
}
