# ProjetWeb
# in front_and_back (backend serv)
deno run --allow-net back_server.ts 3000
# in the front_and_back/static_html_server/ (front serv)
deno run --allow-net --allow-read=./ server.ts 8080
