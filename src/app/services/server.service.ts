import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http'
import {CustomResponse} from '../interfaces/custom-response';
import {Observable, throwError} from 'rxjs';
import {catchError, tap} from 'rxjs/operators';
import {Server} from '../interfaces/server';
import {Status} from '../enum/status.enum';

@Injectable({
  providedIn: 'root'
})
export class ServerService {

  private readonly apiUrl = "http://localhost:8080"

  constructor(private httpClient: HttpClient) {}

  servers$ = <Observable<CustomResponse>>
  this.httpClient.get<CustomResponse>(`${this.apiUrl}/server/list`)
  .pipe(
    tap(console.log),
    catchError(this.handleError),
  );

  save$ = (server: Server) => <Observable<CustomResponse>>
  this.httpClient.post<CustomResponse>(`${this.apiUrl}/server/save`, server)
  .pipe(
    tap(console.log),
    catchError(this.handleError),
  );

  ping$ = (ipAddress: string) => <Observable<CustomResponse>>
  this.httpClient.get<CustomResponse>(`${this.apiUrl}/server/ping/${ipAddress}`)
  .pipe(
    tap(console.log),
    catchError(this.handleError),
  );

  delete$ = (serverId: number) => <Observable<CustomResponse>>
  this.httpClient.delete<CustomResponse>(`${this.apiUrl}/server/delete/${serverId}`)
  .pipe(
    tap(console.log),
    catchError(this.handleError),
  );

  filter$ = (status: Status, response: CustomResponse) => <Observable<CustomResponse>>
  new Observable<CustomResponse>(
    subscriber => {
      console.log(response);
      subscriber.next(
        status === Status.ALL ?
        {...response, message: `Servers filters by ${status} status`} :
        {
          ...response,
          message: response.data.servers!.
          filter(server => server.status === status).length >0 ? `Servers filtered by
          ${status === Status.SERVER_UP ? 'SERVER_UP'
          : 'SERVER_DOWN'} status`: `No servers of ${status} found`,
          data: {
            servers: response.data.servers
            ?.filter(server => server.status === status)
          }
        }
      )
      subscriber.complete();
    }
  )
  .pipe(
    tap(console.log),
    catchError(this.handleError),
  );


  handleError(error: HttpErrorResponse): Observable<never> {
    console.log(error);
    return throwError(() => new Error(`An Error occurred - Error code: ${error.status}`));
  }
}
