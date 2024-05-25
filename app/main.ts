import * as net from "net";

const extractHeaders = (request: string): { [key: string]: string } => {
  const headers: { [key: string]: string } = {};
  const lines = request.split("\r\n");
  for (let i = 1; i < lines.length; i++) {
    if (lines[i] === "") {
      break;
    }
    const [key, value] = lines[i].split(": ");
    headers[key] = value;
  }
  return headers;
};

const formHTTPResponse = (
  statusCode: number,
  statusString?: string,
  headers?: { [key: string]: string }
): string => {
  let response = `HTTP/1.1 ${statusCode} ${statusString || ""}\r\n`;
  if (headers) {
    for (const key in headers) {
      response += `${key}: ${headers[key]}\r\n`;
    }
  }
  response += "\r\n";
  return response;
};

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const requestString = data.toString();
    const headers = extractHeaders(requestString);
    console.log("Request headers:", headers);
    let response;
    // 200 OK on slash, 404 on anything else
    if (requestString.startsWith("GET / HTTP/1.1")) {
      response = formHTTPResponse(200, "OK");
    } else {
      response = formHTTPResponse(404, "Not Found");
    }
    console.log("Sending response:", response);
    socket.write(response);
    socket.end();
    console.log("Sent response and closed connection");
  });
});

server.listen(4221, "localhost", () => {
  console.log("Server is running on port 4221");
});
