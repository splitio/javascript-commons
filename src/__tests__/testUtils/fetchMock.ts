// @TODO upgrade fetch-mock when fetch-mock-jest vulnerabilities are fixed
// https://www.wheresrhys.co.uk/fetch-mock/docs/fetch-mock/Usage/cheatsheet#local-fetch-with-jest
import fetchMockLib from 'fetch-mock';

const fetchMock = fetchMockLib.sandbox();

// config the fetch mock to chain routes (appends the new route to the list of routes)
fetchMock.config.overwriteRoutes = false;

export default fetchMock;
