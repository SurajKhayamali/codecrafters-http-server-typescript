import { existsSync, readFileSync, writeFileSync } from "fs";
import * as net from "net";
import { join } from "path";
import { argv } from "process";

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

// Regex to match HTTP request in pattern GET /echo/{str} HTTP/1.1
const echoPattern = /^GET \/echo\/(.+) HTTP\/1.1/;

const dir = argv[argv.length - 1] || "./files";
// Regex to match HTTP request in pattern GET /files/{filename} HTTP/1.1
const filesPattern = /^GET \/files\/(.+) HTTP\/1.1/;
// Regex to match HTTP request in pattern GET /files/{filename} HTTP/1.1
const filesPostPattern = /^POST \/files\/(.+) HTTP\/1.1/;

const server = net.createServer((socket) => {
  socket.on("data", (data) => {
    const requestString = data.toString();
    const headers = extractHeaders(requestString);
    console.log("Request headers:", headers);
    let response;
    // 200 OK on slash and echo the string on /echo/{str}, 404 on anything else
    if (requestString.startsWith("GET / HTTP/1.1")) {
      response = formHTTPResponse(200, "OK");
    } else if (echoPattern.test(requestString)) {
      const echoMatch = echoPattern.exec(requestString) as RegExpExecArray;
      response = formHTTPResponse(200, "OK", {
        "Content-Type": "text/plain",
        "Content-Length": echoMatch[1].length.toString(),
      });
      response += echoMatch[1];
    } else if (requestString.startsWith("GET /user-agent HTTP/1.1")) {
      const userAgent = headers["User-Agent"];
      response = formHTTPResponse(200, "OK", {
        "Content-Type": "text/plain",
        "Content-Length": userAgent.length.toString(),
      });
      response += userAgent;
    } else if (filesPattern.test(requestString)) {
      const fileMatch = filesPattern.exec(requestString) as RegExpExecArray;
      const filename = fileMatch[1];
      const filePath = join(dir, filename);

      if (existsSync(filePath)) {
        const content = readFileSync(join(dir, filename));
        response = formHTTPResponse(200, "OK", {
          "Content-Type": "application/octet-stream",
          "Content-Length": content.length.toString(),
        });
        response += content;
      } else {
        response = formHTTPResponse(404, "Not Found");
      }
    } else if (filesPostPattern.test(requestString)) {
      const fileMatch = filesPostPattern.exec(requestString) as RegExpExecArray;
      const filename = fileMatch[1];
      const filePath = join(dir, filename);

      if (existsSync(filePath)) {
        response = formHTTPResponse(409, "Conflict");
      } else {
        const content = requestString.split("\r\n\r\n")[1];
        writeFileSync(filePath, content);
        response = formHTTPResponse(201, "Created");
        response += "File created";
      }
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
