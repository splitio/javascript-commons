import { sandbox } from 'fetch-mock';

const fetchMock = sandbox();

// config the fetch mock to chain routes (appends the new route to the list of routes)
fetchMock.config.overwriteRoutes = false;

export default fetchMock;
