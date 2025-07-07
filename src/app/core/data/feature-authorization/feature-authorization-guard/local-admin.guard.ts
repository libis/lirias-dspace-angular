import { ActivatedRouteSnapshot, CanActivate, Router, RouterStateSnapshot, UrlTree } from '@angular/router';
import { catchError, map, Observable, switchMap} from 'rxjs';
import { AuthService } from '../../../auth/auth.service';
import { getFirstSucceededRemoteData, getRemoteDataPayload } from 'src/app/core/shared/operators';
import { returnForbiddenUrlTreeOrLoginOnAllFalse } from 'src/app/core/shared/authorized.operators';
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LocalAdminGuard implements CanActivate {
  constructor(protected router: Router, protected authService: AuthService) {
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {
    return true;
  }
}
