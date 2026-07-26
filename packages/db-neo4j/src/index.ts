import neo4j from "neo4j-driver";

export const defaultNeo4jConfig = {
  uri: "neo4j://127.0.0.1:7687",
  username: "neo4j",
  password: "vc-brain-password",
};

export function createNeo4jDriver() {
  const uri = process.env.NEO4J_URI ?? defaultNeo4jConfig.uri;
  const username = process.env.NEO4J_USERNAME ?? defaultNeo4jConfig.username;
  const password = process.env.NEO4J_PASSWORD ?? defaultNeo4jConfig.password;

  return neo4j.driver(uri, neo4j.auth.basic(username, password));
}
