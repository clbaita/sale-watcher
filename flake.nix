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

        nativeBuildInputs = [ pkgs.removeReferencesTo ];

        buildInputs = with pkgs; [ nodejs ];

        buildPhase = ''
          ln -s ${nodeDependencies}/lib/node_modules ./node_modules
          export PATH="${nodeDependencies}/bin:$PATH"
          tsc
        '';

        installPhase = ''
          cp -r dist $out
          cp -r node_modules $out
          cp data.json $out
          runHook postInstall
        '';

        postInstall = ''
          find "$out" -type f -exec remove-references-to -t ${nodeDependencies} '{}' +
        '';
      };
    in
    {
      devShells.default = pkgs.mkShell {
        buildInputs = with pkgs; [ node2nix nodejs pnpm yarn dive ];

        shellHook = ''
          echo "node `${pkgs.nodejs}/bin/node --version`"
        '';
      };

      packages.saleWatcher-docker = pkgs.dockerTools.buildImage {
        name = "sale-watcher-nix";
        tag = "latest";

        copyToRoot = pkgs.buildEnv {
          name = "image-root";
          paths = [ pkgs.nodejs ];
          pathsToLink = [ "/bin" ];
        };

        config = {
          Cmd = [ "/bin/node" "${saleWatcher}/index.js" ];
          WorkingDir = "${saleWatcher}";
        };
      };
    });
}
