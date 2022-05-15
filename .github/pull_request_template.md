# Javascript commons library

## What did you accomplish?
Added a `flush` method to the client so that client side SDKs can flush on page visibility changes if so desired

## How do we test the changes introduced in this PR?
run the tests added to the sdkClientMethod specs

## Extra Notes

Tested and working on js client sdk. Tests passed too. Having some difficulty getting the jest test to pass in the server side SDK build  - for some reason jest reports that it executes the `syncManager.flush` method twice. Not sure why that is happening. Tested and working with nodejs in any case.