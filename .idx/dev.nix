# To learn more about how to use Nix to configure your environment
# see: https://developers.google.com/idx/guides/customize-idx-env
{ pkgs, ... }: {
  # Which nixpkgs channel to use.
  channel = "stable-23.11"; # or "unstable"
  # Use https://search.nixos.org/packages to find packages
  packages = [
    pkgs.nodejs_20
  ];
  # Sets environment variables in the workspace
  env = {};
  idx = {
    # Search for the extensions you want on https://open-vsx.org/ and use "publisher.id"
    extensions = [
      "google.gemini-cli-vscode-ide-companion"
    ];

    # This block tells IDX to manage a web preview.
    previews = {
      enable = true;
      previews = {
        web = {
          # This command just starts the app. IDX automatically provides the $PORT
          # environment variable, and your app correctly uses it.
          command = ["npm" "run" "start:dev" "--" "--port" "$PORT"];
          manager = "web";
        };
      };
    };

    workspace = {
      # Runs when a workspace is first created
      onCreate = {
        npm-install = "npm ci --no-audit --prefer-offline --no-progress --timing";
      };
      # The server is managed by 'previews', so onStart can be empty.
      onStart = {};
    };
  };
}